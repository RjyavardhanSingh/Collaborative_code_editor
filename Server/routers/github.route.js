import express from "express";
import {
  authenticate,
  createRepo,
  getUserRepos,
  commitChanges,
  getStatus,
  initializeRepository,
  syncFilesToRepo,
  getRepoFiles,
  verifyToken,
} from "../controllers/github.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/authenticate", authenticate);
router.post("/repos", protect, createRepo);
router.get("/repos", protect, getUserRepos);
router.post("/commit", protect, commitChanges);
router.get("/status/:folderId", protect, getStatus);
router.post("/init/:folderId", protect, initializeRepository);
router.post("/sync/:folderId", protect, syncFilesToRepo);
router.get("/files/:folderId", protect, getRepoFiles);
router.get("/verify-token", verifyToken);
router.get("/test", (req, res) => {
  res.json({ message: "GitHub API is working" });
});

export default router;
