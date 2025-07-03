import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        permission: {
          type: String,
          enum: ["read", "write", "admin"],
          default: "read",
        },
      },
    ],
    githubRepo: {
      name: String,
      fullName: String,
      url: String,
      apiUrl: String,
      owner: String,
      defaultBranch: {
        type: String,
        default: "main",
      },
      lastSynced: Date,
      isInitialized: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

const Folder = mongoose.model("Folder", folderSchema);
export default Folder;
