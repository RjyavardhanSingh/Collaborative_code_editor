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
    const folder = await Folder.findById(req.params.id).populate({
      path: "documents",
      select: "title language updatedAt",
    });

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

    res.json(folder);
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
    const { email, permission, selectedFiles } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!["read", "write", "admin"].includes(permission)) {
      return res.status(400).json({ message: "Invalid permission level" });
    }

    const folder = await Folder.findById(req.params.id).populate(
      "owner",
      "username email"
    );

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (folder.owner._id.toString() !== req.user._id.toString()) {
      const userCollaborator = folder.collaborators.find(
        (c) => c.user.toString() === req.user._id.toString()
      );

      if (!userCollaborator || userCollaborator.permission !== "admin") {
        return res
          .status(403)
          .json({ message: "Not authorized to add collaborators" });
      }
    }

    const user = await User.findOne({ email });

    if (user && user._id.toString() === folder.owner._id.toString()) {
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

    if (user) {
      folder.collaborators.push({
        user: user._id,
        permission,
        selectedFiles: selectedFiles || [],
      });
      await folder.save();

      if (selectedFiles && selectedFiles.length > 0) {
        const documents = await Document.find({
          _id: { $in: selectedFiles },
        });

        for (const doc of documents) {
          const docCollaborator = doc.collaborators.find(
            (c) => c.user.toString() === user._id.toString()
          );

          if (!docCollaborator) {
            doc.collaborators.push({
              user: user._id,
              permission,
            });
            await doc.save();
          }
        }
      }

      return res.status(200).json({
        message: "Collaborator added successfully",
        folder,
      });
    } else {
      const invitation = await FolderInvitation.create({
        folderId: folder._id,
        senderId: req.user._id,
        recipientEmail: email,
        permission,
        selectedFiles: selectedFiles || [],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return res.status(201).json({
        message: "Invitation sent successfully",
        invitation,
      });
    }
  } catch (error) {
    console.error("Error adding folder collaborator:", error);
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

    // Get all subfolders recursively
    const getAllSubfolderIds = async (folderId) => {
      const result = [folderId]; // Include the starting folder ID

      const subfolders = await Folder.find({ parentFolder: folderId }).select(
        "_id"
      );
      for (const subfolder of subfolders) {
        const childIds = await getAllSubfolderIds(subfolder._id);
        result.push(...childIds);
      }

      return result;
    };

    // Get all folder IDs in the hierarchy
    const folderIds = await getAllSubfolderIds(id);

    // Get all folders in one query
    const folders = await Folder.find({
      _id: { $in: folderIds },
    }).select("_id name parentFolder");

    // Get all documents in one query
    const documents = await Document.find({
      folder: { $in: folderIds },
    }).select("_id title language updatedAt folder");

    // Create a map for quick folder lookups
    const folderMap = {};
    folders.forEach((folder) => {
      folderMap[folder._id] = {
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
    const rootFolder = folderMap[id];

    // Add subfolders to their parent folders
    folders.forEach((folder) => {
      if (folder._id.toString() === id.toString()) return; // Skip the root folder

      const parentId = folder.parentFolder
        ? folder.parentFolder.toString()
        : null;
      if (parentId && folderMap[parentId]) {
        folderMap[parentId].subfolders.push(folderMap[folder._id]);
      }
    });

    res.json({
      treeStructure: rootFolder,
      flatDocuments: documents,
    });
  } catch (error) {
    console.error("Error fetching folder documents:", error);
    res.status(500).json({ message: error.message });
  }
};
