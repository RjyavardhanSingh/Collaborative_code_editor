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
router.post("/commit", commitChanges);

router.post("/repos", protect, createRepo);
router.get("/repos", protect, getUserRepos);
router.get("/status/:folderId", protect, getStatus);
router.post("/sync/:folderId", protect, syncFilesToRepo);
router.get("/files/:folderId", protect, getRepoFiles);
router.get("/test", (req, res) => {
  res.json({ message: "GitHub API is working" });
});

// Add this middleware to check GitHub permissions
const checkGitHubPermission = async (req, res, next) => {
  try {
    const folderId = req.params.folderId || req.body.folderId;

    if (!folderId) {
      return next(); // No folder ID to check, proceed (will likely fail elsewhere)
    }

    const folder = await Folder.findById(folderId);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const isOwner = folder.owner.toString() === req.user._id.toString();

    if (isOwner) {
      return next(); // Owner has full access
    }

    const collaborator = folder.collaborators.find(
      (c) => c.user.toString() === req.user._id.toString()
    );

    if (!collaborator || collaborator.permission !== "admin") {
      return res.status(403).json({
        message:
          "Only project owners and administrators can use GitHub features",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Error checking permissions" });
  }
};

// Apply to all GitHub routes that need permission checks
router.post(
  "/local-init/:folderId",
  protect,
  checkGitHubPermission,
  localInitializeRepository
);
router.post(
  "/publish/:folderId",
  protect,
  checkGitHubPermission,
  publishToGitHub
);
router.post("/commit", protect, checkGitHubPermission, commitChanges);
router.get("/status/:folderId", protect, checkGitHubPermission, getStatus);
router.post("/sync/:folderId", protect, checkGitHubPermission, syncFilesToRepo);

export default router;
