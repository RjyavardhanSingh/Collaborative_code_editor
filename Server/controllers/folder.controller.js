import Folder from "../models/folder.model.js";
import Document from "../models/document.model.js";
import Activity from "../models/activity.model.js";
import User from "../models/user.model.js";
import FolderInvitation from "../models/folderInvitation.model.js";
import FolderMessage from "../models/folderMessage.model.js";
import { 
  checkFolderAccess, 
  getAllSubfolderIds, 
  buildFolderHierarchy, 
  filterFoldersWithDocuments 
} from "../utils/folderUtils.js";
import { asyncHandler, ErrorResponses, sendError, sendSuccess } from "../utils/responseUtils.js";

export const createFolder = async (req, res) => {
  try {
    const { name, parentFolder } = req.body;

    const folder = await Folder.create({
      name,
      owner: req.user._id,
      parentFolder: parentFolder || null,
    });

    await Activity.create({
      user: req.user._id,
      action: "created",
      documentId: null,
      metadata: { type: "folder", name, folderId: folder._id },
    });

    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({
      $or: [{ owner: req.user._id }, { "collaborators.user": req.user._id }],
    });

    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFolderById = asyncHandler(async (req, res) => {
  const folder = await Folder.findById(req.params.id)
    .populate({
      path: "documents",
      select: "title language updatedAt",
    })
    .populate({
      path: "collaborators.user",
      select: "username email _id",
    });

  if (!folder) {
    return sendError(res, ErrorResponses.notFound('Folder'));
  }

  const { hasAccess } = checkFolderAccess(folder, req.user._id);
  if (!hasAccess) {
    return sendError(res, ErrorResponses.accessDenied());
  }

  // Format the response
  const formattedFolder = {
    ...folder.toObject(),
    collaborators: folder.collaborators.map((collab) => ({
      user: collab.user,
      permission: collab.permission,
      selectedFiles: collab.selectedFiles || [],
    })),
  };

  sendSuccess(res, formattedFolder);
});

export const updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (folder.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    folder.name = name;
    await folder.save();

    res.json(folder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (folder.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const hasDocuments = await Document.exists({ folderId: folder._id });
    if (hasDocuments) {
      return res.status(400).json({
        message:
          "Cannot delete folder with documents. Move or delete them first.",
      });
    }

    await folder.deleteOne();

    res.json({ message: "Folder deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, permission } = req.body; // Remove selectedFiles

    const folder = await Folder.findById(id).populate("owner");
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check if user is owner
    if (folder.owner._id.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the owner can add collaborators" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === folder.owner._id.toString()) {
      return res.status(400).json({ message: "User is already the owner" });
    }

    const existingCollaborator = folder.collaborators.find(
      (c) => user && c.user.toString() === user._id.toString()
    );

    if (existingCollaborator) {
      return res
        .status(400)
        .json({ message: "User is already a collaborator" });
    }

    // Simplified collaborator addition - no selectedFiles
    folder.collaborators.push({
      user: user._id,
      permission,
      // Remove selectedFiles field
    });

    await folder.save();

    res.status(201).json({
      message: "Collaborator added successfully",
      collaborator: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
        },
        permission,
      },
    });
  } catch (error) {
    console.error("Error adding collaborator:", error);
    res.status(500).json({ message: error.message });
  }
};

export const removeCollaborator = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (folder.owner.toString() !== req.user._id.toString()) {
      const userCollaborator = folder.collaborators.find(
        (c) => c.user.toString() === req.user._id.toString()
      );

      if (!userCollaborator || userCollaborator.permission !== "admin") {
        return res.status(403).json({
          message: "Only the owner or admin can remove collaborators",
        });
      }
    }

    folder.collaborators = folder.collaborators.filter(
      (c) => c.user.toString() !== req.params.userId
    );

    await folder.save();

    const folderDocuments = await Document.find({ folder: folder._id });
    for (const doc of folderDocuments) {
      doc.collaborators = doc.collaborators.filter(
        (c) => c.user.toString() !== req.params.userId
      );
      await doc.save();
    }

    res.json({ message: "Collaborator removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFolderCollaborators = asyncHandler(async (req, res) => {
  const folder = await Folder.findById(req.params.id)
    .populate("collaborators.user", "username email avatar")
    .populate("owner", "username email avatar");

  if (!folder) {
    return sendError(res, ErrorResponses.notFound('Folder'));
  }

  const { hasAccess } = checkFolderAccess(folder, req.user._id);
  if (!hasAccess) {
    return sendError(res, ErrorResponses.accessDenied());
  }

  const formattedCollaborators = folder.collaborators.map((c) => ({
    user: {
      _id: c.user._id,
      username: c.user.username,
      email: c.user.email,
      avatar: c.user.avatar,
    },
    permission: c.permission,
    selectedFiles: c.selectedFiles || [],
  }));

  sendSuccess(res, {
    owner: {
      _id: folder.owner._id,
      username: folder.owner.username,
      email: folder.owner.email,
      avatar: folder.owner.avatar,
    },
    collaborators: formattedCollaborators,
  });
});

export const getFolderMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const folder = await Folder.findById(id);
  if (!folder) {
    return sendError(res, ErrorResponses.notFound('Folder'));
  }

  const { hasAccess } = checkFolderAccess(folder, req.user._id);
  if (!hasAccess) {
    return sendError(res, ErrorResponses.accessDenied());
  }

  const messages = await FolderMessage.find({ folderId: id })
    .sort({ createdAt: 1 })
    .populate("sender", "username avatar");

  sendSuccess(res, messages);
});

export const createFolderMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return sendError(res, ErrorResponses.badRequest('Message content is required'));
  }

  const folder = await Folder.findById(id);
  if (!folder) {
    return sendError(res, ErrorResponses.notFound('Folder'));
  }

  const { hasAccess } = checkFolderAccess(folder, req.user._id);
  if (!hasAccess) {
    return sendError(res, ErrorResponses.accessDenied());
  }

  const message = await FolderMessage.create({
    folderId: id,
    content,
    sender: req.user._id,
  });

  await message.populate("sender", "username avatar");

  req.app.get("io").to(`folder:${id}`).emit("new-message", message);

  sendSuccess(res, message, null, 201);
});

export const getFolderDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the folder
  const folder = await Folder.findById(id).populate("collaborators.user", "_id");
  if (!folder) {
    return sendError(res, ErrorResponses.notFound('Folder'));
  }

  // Check permissions and get collaborator info
  const { isOwner, collaborator, hasAccess } = checkFolderAccess(folder, req.user._id);
  if (!hasAccess) {
    return sendError(res, ErrorResponses.accessDenied());
  }

  // If collaborator with selected files, filter to just those files
  let filteredFileIds = null;
  if (!isOwner && collaborator?.selectedFiles?.length > 0) {
    filteredFileIds = collaborator.selectedFiles.map((id) => id.toString());
  }

  // Get all folder IDs in the hierarchy using utility function
  const folderIds = await getAllSubfolderIds(id, [folder]);

  // Get all folders and documents in one query each
  let folders = await Folder.find({ _id: { $in: folderIds } }).select("_id name parentFolder");
  let documents = await Document.find({ folder: { $in: folderIds } })
    .select("_id title language updatedAt folder");

  // Filter documents and folders if needed based on permissions
  if (filteredFileIds) {
    const filtered = filterFoldersWithDocuments(folders, documents, filteredFileIds);
    folders = filtered.filteredFolders;
    documents = filtered.filteredDocuments;
  }

  // Build the folder hierarchy using utility function
  const rootFolder = buildFolderHierarchy(folders, documents, id);
  if (!rootFolder) {
    return sendError(res, ErrorResponses.notFound('Folder structure'));
  }

  // Log the filtered documents for debugging
  console.log(
    `Filtered documents for folder ${id}:`,
    documents.map((d) => ({ id: d._id, title: d.title }))
  );

  // Return both tree structure and flat documents list
  sendSuccess(res, {
    treeStructure: rootFolder,
    flatDocuments: documents,
    hasFilteredAccess: !!filteredFileIds,
    filteredFileIds: filteredFileIds,
  });
});

export const getFolderDocument = asyncHandler(async (req, res) => {
  const { id, documentId } = req.params;

  // Find the folder
  const folder = await Folder.findById(id);
  if (!folder) {
    return sendError(res, ErrorResponses.notFound('Folder'));
  }

  // Check if user has access to this folder
  const { hasAccess } = checkFolderAccess(folder, req.user._id);
  if (!hasAccess) {
    return sendError(res, ErrorResponses.accessDenied('Access denied to this folder'));
  }

  // Find the document
  const document = await Document.findById(documentId);
  if (!document) {
    return sendError(res, ErrorResponses.notFound('Document'));
  }

  // Verify document belongs to this folder
  const documentFolderId = document.folder?.toString();
  if (documentFolderId !== id) {
    return sendError(res, ErrorResponses.notFound('Document not found in this folder'));
  }

  // Return the document
  sendSuccess(res, document);
});

// Add this new controller function to folder.controller.js
export const updateCollaboratorPermission = async (req, res) => {
  try {
    const { id, collaboratorId } = req.params;
    const { permission } = req.body;

    if (!["read", "write", "admin"].includes(permission)) {
      return res.status(400).json({ message: "Invalid permission level" });
    }

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check if user has permission to modify collaborators
    const isOwner = folder.owner.toString() === req.user._id.toString();
    const userCollaborator = folder.collaborators.find(
      (c) => c.user.toString() === req.user._id.toString()
    );
    const hasAdminRights =
      isOwner || (userCollaborator && userCollaborator.permission === "admin");

    if (!hasAdminRights) {
      return res.status(403).json({
        message: "Only the owner or admin can modify collaborator permissions",
      });
    }

    // Find and update the collaborator
    const collaborator = folder.collaborators.find(
      (c) => c.user.toString() === collaboratorId
    );

    if (!collaborator) {
      return res.status(404).json({ message: "Collaborator not found" });
    }

    // Update permission
    collaborator.permission = permission;
    await folder.save();

    // Also update permission for all documents in this folder
    const folderDocuments = await Document.find({ folder: folder._id });
    for (const doc of folderDocuments) {
      const docCollaborator = doc.collaborators.find(
        (c) => c.user.toString() === collaboratorId
      );
      if (docCollaborator) {
        docCollaborator.permission = permission;
        await doc.save();
      }
    }

    res.json({
      message: "Collaborator permission updated successfully",
      collaborator: {
        user: collaborator.user,
        permission: collaborator.permission,
      },
    });
  } catch (error) {
    console.error("Error updating collaborator permission:", error);
    res.status(500).json({ message: error.message });
  }
};
