import Folder from "../models/folder.model.js";
import Document from "../models/document.model.js";
import Activity from "../models/activity.model.js";
import User from "../models/user.model.js";
import FolderInvitation from "../models/folderInvitation.model.js";
import FolderMessage from "../models/folderMessage.model.js";

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

export const getFolderById = async (req, res) => {
  try {
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
      return res.status(404).json({ message: "Folder not found" });
    }

    const isOwner = folder.owner.toString() === req.user._id.toString();
    const isCollaborator = folder.collaborators.some(
      (c) => c.user._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "Access denied" });
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

    res.json(formattedFolder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

export const getFolderCollaborators = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id)
      .populate("collaborators.user", "username email avatar")
      .populate("owner", "username email avatar");

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const isOwner = folder.owner._id.toString() === req.user._id.toString();
    const isCollaborator = folder.collaborators.some(
      (c) => c.user._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "Access denied" });
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

    res.json({
      owner: {
        _id: folder.owner._id,
        username: folder.owner.username,
        email: folder.owner.email,
        avatar: folder.owner.avatar,
      },
      collaborators: formattedCollaborators,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFolderMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const isOwner = folder.owner.toString() === req.user._id.toString();
    const isCollaborator = folder.collaborators.some(
      (c) => c.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await FolderMessage.find({ folderId: id })
      .sort({ createdAt: 1 })
      .populate("sender", "username avatar");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createFolderMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const isOwner = folder.owner.toString() === req.user._id.toString();
    const isCollaborator = folder.collaborators.some(
      (c) => c.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "Access denied" });
    }

    const message = await FolderMessage.create({
      folderId: id,
      content,
      sender: req.user._id,
    });

    await message.populate("sender", "username avatar");

    req.app.get("io").to(`folder:${id}`).emit("new-message", message);

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFolderDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the folder
    const folder = await Folder.findById(id).populate(
      "collaborators.user",
      "_id"
    );
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check permissions
    const isOwner = folder.owner.toString() === req.user._id.toString();
    const collaborator = folder.collaborators.find(
      (c) => c.user._id?.toString() === req.user._id.toString()
    );

    if (!isOwner && !collaborator) {
      return res.status(403).json({ message: "Access denied" });
    }

    // If collaborator with selected files, filter to just those files
    let filteredFileIds = null;
    if (
      !isOwner &&
      collaborator &&
      collaborator.selectedFiles &&
      collaborator.selectedFiles.length > 0
    ) {
      filteredFileIds = collaborator.selectedFiles.map((id) => id.toString());
    }

    // Get all subfolders recursively
    const getAllSubfolderIds = (folders, rootId) => {
      const result = [rootId]; // Include the root folder itself

      const findChildren = (parentId) => {
        folders.forEach((folder) => {
          if (folder.parentFolder?.toString() === parentId?.toString()) {
            result.push(folder._id);
            findChildren(folder._id); // Recursively find children
          }
        });
      };

      findChildren(rootId);
      console.log(`Found subfolder IDs for ${rootId}:`, result);
      return result;
    };

    // Get all folder IDs in the hierarchy
    const folderIds = getAllSubfolderIds([folder], id);

    // Get all folders in one query
    const folders = await Folder.find({
      _id: { $in: folderIds },
    }).select("_id name parentFolder");

    // Get all documents in one query
    let documents = await Document.find({
      folder: { $in: folderIds },
    }).select("_id title language updatedAt folder");

    // Filter documents if needed based on permissions
    if (filteredFileIds) {
      documents = documents.filter((doc) =>
        filteredFileIds.includes(doc._id.toString())
      );

      // Track which folders contain shared files
      const relevantFolderIds = new Set();

      // Add each document's immediate folder
      documents.forEach((doc) => {
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
      folders = folders.filter((folder) =>
        relevantFolderIds.has(folder._id.toString())
      );
    }

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
    const rootFolder = folderMap[id.toString()];
    if (!rootFolder) {
      return res.status(404).json({ message: "Folder structure not found" });
    }

    // Add subfolders to their parent folders
    folders.forEach((folder) => {
      if (folder._id.toString() === id.toString()) return; // Skip the root folder

      const parentId = folder.parentFolder
        ? folder.parentFolder.toString()
        : null;
      if (parentId && folderMap[parentId]) {
        folderMap[parentId].subfolders.push(folderMap[folder._id.toString()]);
      }
    });

    // Log the filtered documents for debugging
    console.log(
      `Filtered documents for folder ${id}:`,
      documents.map((d) => ({ id: d._id, title: d.title }))
    );

    // Return both tree structure and flat documents list
    res.json({
      treeStructure: rootFolder,
      flatDocuments: documents,
      hasFilteredAccess: !!filteredFileIds,
      filteredFileIds: filteredFileIds,
    });
  } catch (error) {
    console.error("Error fetching folder documents:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add this new controller function
export const getFolderDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;

    // Find the folder
    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check if user has access to this folder
    const userId = req.user._id.toString();
    const isOwner = folder.owner.toString() === userId;
    const isCollaborator = folder.collaborators.some(
      (col) => col.user.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "Access denied to this folder" });
    }

    // Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Verify document belongs to this folder
    const documentFolderId = document.folder?.toString();
    if (documentFolderId !== id) {
      return res
        .status(404)
        .json({ message: "Document not found in this folder" });
    }

    // Return the document
    res.json(document);
  } catch (error) {
    console.error("Error fetching folder document:", error);
    res.status(500).json({ message: error.message });
  }
};

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
