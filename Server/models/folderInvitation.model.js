import mongoose from "mongoose";

const folderInvitationSchema = new mongoose.Schema(
  {
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    permission: {
      type: String,
      enum: ["read", "write", "admin"],
      default: "read",
    },
    selectedFiles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add index to improve query performance
folderInvitationSchema.index({ recipientEmail: 1, folderId: 1 });

const FolderInvitation = mongoose.model(
  "FolderInvitation",
  folderInvitationSchema
);

export default FolderInvitation;
