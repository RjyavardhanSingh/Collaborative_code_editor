import express from "express";
import {
  authenticate,
  createRepo,
  getUserRepos,
  commitChanges,
  getStatus,
  syncFilesToRepo,
  getRepoFiles,
  verifyToken,
  localInitializeRepository, // Add new controller
  publishToGitHub, // Add new controller
} from "../controllers/github.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/authenticate", authenticate);
router.post("/local-init/:folderId", localInitializeRepository);
router.post("/publish/:folderId", protect, publishToGitHub); // Keep protect for security
router.get("/verify-token", verifyToken); // No protect needed here
router.post("/commit",commitChanges);

router.post("/repos", protect, createRepo);
router.get("/repos", protect, getUserRepos);
router.get("/status/:folderId", protect, getStatus);
router.post("/sync/:folderId", protect, syncFilesToRepo);
router.get("/files/:folderId", protect, getRepoFiles);
router.get("/test", (req, res) => {
  res.json({ message: "GitHub API is working" });
});

export default router;
