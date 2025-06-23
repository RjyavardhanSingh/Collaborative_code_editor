import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
} from "../controllers/folder.controller.js";

const router = express.Router();

router.post("/", protect, createFolder);
router.get("/", protect, getFolders);
router.get("/:id", protect, getFolderById);
router.put("/:id", protect, updateFolder);
router.delete("/:id", protect, deleteFolder);

export default router;
