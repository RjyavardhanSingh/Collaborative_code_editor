import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  getUserDocuments,
  completeOnboarding,
  getInvitationCount,
  getInvitations,
  cancelInvitation,
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();


router.get("/invitations/count", protect, getInvitationCount);
router.get("/invitations", protect, getInvitations);
router.delete("/invitations/:id", protect, cancelInvitation);
router.post("/onboarding", protect, completeOnboarding);


router.get("/:id", protect, getUserProfile);
router.put("/:id", protect, updateUserProfile);
router.get("/:id/documents", protect, getUserDocuments);

export default router;
