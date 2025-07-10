import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  getUserDocuments,
  completeOnboarding,
  getInvitationCount,
  getInvitations,
  cancelInvitation,
  getSharedContent,
  deleteAccount, // Add this import
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.get("/invitations/count", protect, getInvitationCount);
router.get("/invitations", protect, getInvitations);
router.delete("/invitations/:id", protect, cancelInvitation);
router.post("/onboarding", protect, completeOnboarding);

router.get("/:id", protect, getUserProfile);
router.put("/:id", protect, updateUserProfile);
router.delete("/:id", protect, deleteAccount); // Add this route
router.get("/:id/documents", protect, getUserDocuments);
router.get("/:id/shared", protect, getSharedContent);

export default router;
