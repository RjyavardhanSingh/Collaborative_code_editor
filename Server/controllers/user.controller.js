import User from "../models/user.model.js";
import Document from "../models/document.model.js";
import Invitation from "../models/invitation.model.js";

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user._id.toString() !== req.params.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this profile" });
    }

    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    user.avatar = req.body.avatar || user.avatar;

    if (req.body.password) {
      user.passwordHash = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserDocuments = async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to view these documents" });
    }

    const documents = await Document.find({ owner: req.params.id })
      .select("title language updatedAt isPublic")
      .sort({ updatedAt: -1 });

    const sharedDocuments = await Document.find({
      "collaborators.user": req.params.id,
    })
      .select("title language updatedAt isPublic owner")
      .populate("owner", "username avatar")
      .sort({ updatedAt: -1 });

    res.json({
      owned: documents,
      shared: sharedDocuments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const completeOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.avatar) user.avatar = req.body.avatar;
    if (req.body.bio) user.bio = req.body.bio;
    if (req.body.preferredLanguages)
      user.preferredLanguages = req.body.preferredLanguages;
    if (req.body.theme) user.theme = req.body.theme;

    user.onboardingCompleted = true;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      preferredLanguages: updatedUser.preferredLanguages,
      theme: updatedUser.theme,
      onboardingCompleted: updatedUser.onboardingCompleted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvitations = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const invitations = await Invitation.find({
      recipientEmail: req.user.email,
      status: "pending",
    })
      .populate({
        path: "documentId",
        select: "title owner",
        model: "Document",
      })
      .populate({
        path: "senderId",
        select: "username avatar",
        model: "User",
      });

    // Transform the data to match client expectations
    const transformedInvitations = invitations.map((inv) => ({
      _id: inv._id,
      document: inv.documentId
        ? {
            _id: inv.documentId._id,
            title: inv.documentId.title,
          }
        : null,
      sender: inv.senderId
        ? {
            _id: inv.senderId._id,
            username: inv.senderId.username,
            avatar: inv.senderId.avatar,
          }
        : null,
      recipientEmail: inv.recipientEmail,
      permission: inv.permission,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));

    res.json(transformedInvitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    res.status(500).json({ message: "Failed to fetch invitations" });
  }
};

export const getInvitationCount = async (req, res) => {
  try {
    const count = await Invitation.countDocuments({
      recipientEmail: req.user.email,
      status: "pending",
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Only allow cancellation by the sender
    if (invitation.senderId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this invitation" });
    }

    await Invitation.findByIdAndDelete(req.params.id);

    res.json({ message: "Invitation cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    res.status(500).json({ message: "Failed to cancel invitation" });
  }
};
