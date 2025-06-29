import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import Document from "../models/document.model.js";
import Folder from "../models/folder.model.js";

export const protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized, no token provided!" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const session = await Session.findOne({ token });

    if (!session) {
      return res
        .status(401)
        .json({ message: "Invalid seesion!, please login" });
    }

    if (session.expiresAt < Date.now()) {
      await Session.findByIdAndDelete(session._id);
      return res.status(401).json({ messgae: "Session expired" });
    }

    req.user = await User.findById(decoded.userId).select("-passwordHash");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized, token failed" });
  }
};

export const checkDocumentPermission = (requiredPermission = "read") => {
  return async (req, res, next) => {
    try {
      const document = await Document.findById(req.params.id).populate(
        "folder"
      );

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const userId = req.user._id.toString();

      // Check if user is document owner
      if (document.owner.toString() === userId) {
        req.document = document;
        return next();
      }

      // Check if user is document collaborator
      const collaborator = document.collaborators.find(
        (c) => c.user.toString() === userId
      );

      if (
        collaborator &&
        hasRequiredPermission(collaborator.permission, requiredPermission)
      ) {
        req.document = document;
        return next();
      }

      // NEW: Check if user has access through folder permissions
      if (document.folder) {
        // Handle both object and string IDs
        const folderId =
          typeof document.folder === "object"
            ? document.folder._id.toString()
            : document.folder.toString();

        const folder = await Folder.findById(folderId);
        if (folder) {
          // Check if user is folder owner
          if (folder.owner.toString() === userId) {
            req.document = document;
            return next();
          }

          // Check if user is folder collaborator with required permission
          const folderCollaborator = folder.collaborators.find(
            (c) => c.user.toString() === userId
          );

          if (
            folderCollaborator &&
            hasRequiredPermission(
              folderCollaborator.permission,
              requiredPermission
            )
          ) {
            req.document = document;
            return next();
          }
        }
      }

      res.status(403).json({
        message: "You do not have permission to access this document",
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

// Helper function to check permission levels
function hasRequiredPermission(userPermission, requiredPermission) {
  const permissionLevels = { read: 1, write: 2, admin: 3 };
  return (
    permissionLevels[userPermission] >= permissionLevels[requiredPermission]
  );
}

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
