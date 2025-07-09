import Folder from "../models/folder.model.js";
import Document from "../models/document.model.js";

/**
 * Check if a user has access to a folder (either as owner or collaborator)
 * @param {Object} folder - The folder object
 * @param {string} userId - The user ID to check
 * @returns {Object} Access information { isOwner, isCollaborator, collaborator, hasAccess }
 */
export const checkFolderAccess = (folder, userId) => {
  const isOwner = folder.owner.toString() === userId.toString();
  const collaborator = folder.collaborators.find(
    (c) => c.user?.toString() === userId.toString() || c.user?._id?.toString() === userId.toString()
  );
  const isCollaborator = !!collaborator;
  const hasAccess = isOwner || isCollaborator;

  return {
    isOwner,
    isCollaborator,
    collaborator,
    hasAccess
  };
};

/**
 * Get all subfolder IDs recursively from a root folder
 * @param {string} rootId - The root folder ID
 * @param {Array} allFolders - Optional array of all folders to search in (for performance)
 * @returns {Array} Array of folder IDs including the root
 */
export const getAllSubfolderIds = async (rootId, allFolders = null) => {
  const result = [rootId]; // Include the root folder itself

  // If folders are provided, use them instead of querying
  if (allFolders) {
    const findChildren = (parentId) => {
      allFolders.forEach((folder) => {
        if (folder.parentFolder?.toString() === parentId?.toString()) {
          result.push(folder._id);
          findChildren(folder._id); // Recursively find children
        }
      });
    };
    findChildren(rootId);
  } else {
    // Recursive database query approach
    const subfolders = await Folder.find({ parentFolder: rootId }).select("_id");
    for (const subfolder of subfolders) {
      const childIds = await getAllSubfolderIds(subfolder._id);
      result.push(...childIds);
    }
  }

  return result;
};

/**
 * Count documents in a folder tree recursively
 * @param {string} folderId - The root folder ID
 * @returns {number} Total document count
 */
export const countDocumentsInFolderTree = async (folderId) => {
  const folderIds = await getAllSubfolderIds(folderId);
  const count = await Document.countDocuments({
    folder: { $in: folderIds },
  });
  return count;
};

/**
 * Build folder hierarchy structure from flat folder and document arrays
 * @param {Array} folders - Array of folder objects
 * @param {Array} documents - Array of document objects
 * @param {string} rootId - The root folder ID
 * @returns {Object} Folder hierarchy object
 */
export const buildFolderHierarchy = (folders, documents, rootId) => {
  // Create a map for quick folder lookups
  const folderMap = {};
  folders.forEach((folder) => {
    folderMap[folder._id.toString()] = {
      _id: folder._id,
      name: folder.name,
      type: "folder",
      parentFolder: folder.parentFolder,
      documents: [],
      subfolders: [],
    };
  });

  // Assign documents to their respective folders
  documents.forEach((doc) => {
    const folderId = doc.folder.toString();
    if (folderMap[folderId]) {
      folderMap[folderId].documents.push({
        _id: doc._id,
        title: doc.title,
        language: doc.language,
        updatedAt: doc.updatedAt,
      });
    }
  });

  // Build the folder hierarchy
  const rootFolder = folderMap[rootId.toString()];
  if (!rootFolder) {
    return null;
  }

  // Add subfolders to their parent folders
  folders.forEach((folder) => {
    if (folder._id.toString() === rootId.toString()) return; // Skip the root folder

    const parentId = folder.parentFolder ? folder.parentFolder.toString() : null;
    if (parentId && folderMap[parentId]) {
      folderMap[parentId].subfolders.push(folderMap[folder._id.toString()]);
    }
  });

  return rootFolder;
};

/**
 * Filter folders to include only those containing specific documents and their parent hierarchy
 * @param {Array} folders - Array of folder objects
 * @param {Array} documents - Array of document objects
 * @param {Array} filteredFileIds - Array of document IDs to filter by
 * @returns {Object} { filteredFolders, filteredDocuments }
 */
export const filterFoldersWithDocuments = (folders, documents, filteredFileIds) => {
  // Filter documents first
  const filteredDocuments = documents.filter((doc) =>
    filteredFileIds.includes(doc._id.toString())
  );

  // Track which folders contain shared files
  const relevantFolderIds = new Set();

  // Add each document's immediate folder
  filteredDocuments.forEach((doc) => {
    if (doc.folder) {
      relevantFolderIds.add(doc.folder.toString());
    }
  });

  // Add all parent folders up to the root
  const addParentFolders = (folderId) => {
    const folder = folders.find((f) => f._id.toString() === folderId);
    if (folder && folder.parentFolder) {
      const parentId = folder.parentFolder.toString();
      relevantFolderIds.add(parentId);
      addParentFolders(parentId);
    }
  };

  // Process each folder containing shared files
  [...relevantFolderIds].forEach((folderId) => {
    addParentFolders(folderId);
  });

  // Filter folders to only include relevant ones
  const filteredFolders = folders.filter((folder) =>
    relevantFolderIds.has(folder._id.toString())
  );

  return { filteredFolders, filteredDocuments };
};