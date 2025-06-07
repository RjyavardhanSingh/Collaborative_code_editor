import Invitation from "../models/invitation.model.js";
import Document from "../models/document.model.js";
import User from "../models/user.model.js";

export const acceptInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invitation.recipientEmail !== req.user.email) {
      return res
        .status(403)
        .json({
          message: "You don't have permission to accept this invitation",
        });
    }

    if (invitation.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This invitation has already been processed" });
    }

    const document = await Document.findById(invitation.documentId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const existingCollaborator = document.collaborators.find(
      (c) => c.user.toString() === req.user._id.toString()
    );

    if (!existingCollaborator) {
      document.collaborators.push({
        user: req.user._id,
        permission: invitation.permission,
      });

      await document.save();
    }

    invitation.status = "accepted";
    await invitation.save();

    return res.json({
      message: "Invitation accepted successfully",
      documentId: document._id,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ message: error.message });
  }
};

export const rejectInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    if (invitation.recipientEmail !== req.user.email) {
      return res
        .status(403)
        .json({
          message: "You don't have permission to reject this invitation",
        });
    }
    if (invitation.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This invitation has already been processed" });
    }
    invitation.status = "rejected";
    await invitation.save();

    return res.json({
      message: "Invitation rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting invitation:", error);
    res.status(500).json({ message: error.message });
  }
};
