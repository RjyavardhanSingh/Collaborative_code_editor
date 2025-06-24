import Folder from "../models/folder.model.js";
import Document from "../models/document.model.js";
import Activity from "../models/activity.model.js";

// Create a new folder
export const createFolder = async (req, res) => {
  try {
    const { name, parentFolder } = req.body;

    const folder = await Folder.create({
      name,
      owner: req.user._id,
      parentFolder: parentFolder || null,
    });

    // Log activity
    await Activity.create({
      user: req.user._id,
      action: "created",
      documentId: null, // Add this line to provide a null documentId
      metadata: { type: "folder", name, folderId: folder._id },
    });

    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get folders for current user
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

// Get a folder by ID
export const getFolderById = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id).populate({
      path: "documents",
      select: "title language updatedAt",
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check if user has access to this folder
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

// Update a folder
export const updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check ownership
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

// Delete a folder
export const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check ownership
    if (folder.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if folder has documents
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
