import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import Document from "../models/document.model.js";

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

export const checkDocumentPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const documentId = req.params.id;
      const userId = req.user._id;

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (document.owner.toString() === userId.toString()) {
        return next();
      }

      const collaborator = document.collaborators.find(
        (c) => c.user.toString() === userId.toString()
      );

      if (!collaborator) {
        return res.status(403).json({ message: "Access denied" });
      }

      const permissions = {
        read: ["read", "write", "admin"],
        write: ["write", "admin"],
        admin: ["admin"],
      };

      if (!permissions[requiredPermission].includes(collaborator.permission)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  };
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
