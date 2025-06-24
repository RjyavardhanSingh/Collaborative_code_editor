import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      // Make it conditionally required - only if the activity is not folder-related
      required: function() {
        return !this.metadata || this.metadata.type !== 'folder';
      }
    },
    action: {
      type: String,
      required: true,
      enum: ["created", "edited", "renamed", "deleted", "shared"],
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Activity = mongoose.model("Activity", activitySchema);
export default Activity;