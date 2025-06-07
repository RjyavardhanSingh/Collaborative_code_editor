import express from "express";
import {
  acceptInvitation,
  rejectInvitation,
} from "../controllers/invitation.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/:id/accept", protect, acceptInvitation);
router.post("/:id/reject", protect, rejectInvitation);

export default router;
