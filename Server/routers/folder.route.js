import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  addCollaborator,
  removeCollaborator,
  getFolderCollaborators,
  getFolderMessages,
  createFolderMessage,
  getFolderDocuments, // Add this import
  getFolderDocument, // Add this import
} from "../controllers/folder.controller.js";

const router = express.Router();

router.post("/", protect, createFolder);
router.get("/", protect, getFolders);
router.get("/:id", protect, getFolderById);
router.put("/:id", protect, updateFolder);
router.delete("/:id", protect, deleteFolder);
router.post("/:id/collaborators", protect, addCollaborator);
router.delete("/:id/collaborators/:userId", protect, removeCollaborator);
router.get("/:id/collaborators", protect, getFolderCollaborators);
router.get("/:id/messages", protect, getFolderMessages);
router.post("/:id/messages", protect, createFolderMessage);
router.get("/:id/documents", protect, getFolderDocuments); // Add this route
router.get("/:id/documents/:documentId", protect, getFolderDocument); // Add this route to your folder routes

export default router;
