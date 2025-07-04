import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Document from "../models/document.model.js";
import Folder from "../models/folder.model.js";
import FolderMessage from "../models/folderMessage.model.js";

export const setupSocketHandlers = (io) => {
  const activeUsers = new Map();
  const documentUsers = new Map();
  const folderUsers = new Map();

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-passwordHash");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;

    activeUsers.set(user._id.toString(), socket.id);

    socket.on("join-document", async ({ documentId }) => {
      try {
        const document = await Document.findById(documentId);

        if (!document) {
          socket.emit("error", { message: "Document not found" });
          return;
        }

        const isOwner = document.owner.toString() === user._id.toString();
        const isCollaborator = document.collaborators.some(
          (c) => c.user.toString() === user._id.toString()
        );

        if (!isOwner && !isCollaborator && !document.isPublic) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        socket.join(`document:${documentId}`);

        if (!documentUsers.has(documentId)) {
          documentUsers.set(documentId, new Map());
        }

        const docUsers = documentUsers.get(documentId);
        docUsers.set(user._id.toString(), {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
        });

        io.to(`document:${documentId}`).emit("user-joined", {
          user: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
          },
          users: Array.from(docUsers.values()),
        });
      } catch (error) {
        socket.emit("error", { message: "Error joining document" });
      }
    });

    socket.on("leave-document", ({ documentId }) => {
      socket.leave(`document:${documentId}`);

      if (documentUsers.has(documentId)) {
        const docUsers = documentUsers.get(documentId);
        docUsers.delete(user._id.toString());

        if (docUsers.size === 0) {
          documentUsers.delete(documentId);
        } else {
          io.to(`document:${documentId}`).emit("user-left", {
            userId: user._id,
            users: Array.from(docUsers.values()),
          });
        }
      }
    });

    socket.on("document-change", ({ documentId, changes }) => {
      socket.to(`document:${documentId}`).emit("document-change", {
        changes,
        userId: user._id,
      });
    });

    socket.on("cursor-position", ({ documentId, position }) => {
      if (documentUsers.has(documentId)) {
        const docUsers = documentUsers.get(documentId);
        const userData = docUsers.get(user._id.toString());

        if (userData) {
          userData.cursor = position;

          // Include user info in the broadcast
          socket.to(`document:${documentId}`).emit("cursor-position", {
            userId: user._id,
            username: user.username, // Include username
            position,
            // Optionally include avatar if available
            avatar: user.avatar || null,
          });
        }
      }
    });

    socket.on("user-presence", ({ documentId, status }) => {
      if (documentUsers.has(documentId)) {
        const docUsers = documentUsers.get(documentId);
        const userData = docUsers.get(user._id.toString());

        if (userData) {
          userData.status = status;

          socket.to(`document:${documentId}`).emit("user-presence", {
            userId: user._id,
            status,
          });
        }
      }
    });

    // Handle joining folders
    socket.on("join-folder", async ({ folderId }) => {
      try {
        if (!user) {
          socket.emit("error", { message: "Authentication required" });
          return;
        }

        // Look up the folder to verify access
        const folder = await Folder.findById(folderId)
          .populate("owner", "username email avatar")
          .populate("collaborators.user", "username email avatar");

        if (!folder) {
          socket.emit("error", { message: "Folder not found" });
          return;
        }

        // Check if user has access
        const isOwner = folder.owner._id.toString() === user._id.toString();
        const isCollaborator = folder.collaborators.some(
          (c) => c.user._id.toString() === user._id.toString()
        );

        if (!isOwner && !isCollaborator) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Join the folder room
        socket.join(`folder:${folderId}`);

        // Track the user in the folder
        if (!folderUsers.has(folderId)) {
          folderUsers.set(folderId, new Map());
        }

        const userInfo = {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
        };

        folderUsers.get(folderId).set(user._id.toString(), userInfo);

        // Broadcast to other users in the folder
        const folderUsersList = Array.from(folderUsers.get(folderId).values());

        io.to(`folder:${folderId}`).emit("folder-user-joined", {
          user: userInfo,
          users: folderUsersList,
        });

        console.log(`User ${user.username} joined folder ${folderId}`);
      } catch (error) {
        console.error("Error joining folder:", error);
        socket.emit("error", { message: "Error joining folder" });
      }
    });

    socket.on("leave-folder", ({ folderId }) => {
      socket.leave(`folder:${folderId}`);

      if (folderUsers.has(folderId)) {
        const folderUserMap = folderUsers.get(folderId);
        folderUserMap.delete(user._id.toString());

        if (folderUserMap.size === 0) {
          folderUsers.delete(folderId);
        } else {
          io.to(`folder:${folderId}`).emit("folder-user-left", {
            userId: user._id,
            users: Array.from(folderUserMap.values()),
          });
        }
      }
    });

    socket.on(
      "document-activity",
      ({ folderId, documentId, documentTitle }) => {
        console.log(
          `User ${user.username} is working on document ${documentTitle} in folder ${folderId}`
        );

        // Broadcast to other users in the folder
        socket.to(`folder:${folderId}`).emit("document-activity", {
          userId: user._id,
          username: user.username,
          documentId,
          documentTitle,
        });
      }
    );

    socket.on("send-message", async ({ content, folderId, sender }) => {
      try {
        // Create message in database
        const message = new FolderMessage({
          content,
          folderId,
          sender: user._id,
        });
        await message.save();

        // Format message for sending
        const messageToSend = {
          _id: message._id,
          content,
          folderId,
          sender: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
          },
          timestamp: new Date(),
        };

        // Send to all users in the folder
        io.to(`folder:${folderId}`).emit("new-message", messageToSend);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      activeUsers.delete(user._id.toString());

      for (const [documentId, users] of documentUsers.entries()) {
        if (users.has(user._id.toString())) {
          users.delete(user._id.toString());

          if (users.size === 0) {
            documentUsers.delete(documentId);
          } else {
            io.to(`document:${documentId}`).emit("user-left", {
              userId: user._id,
              users: Array.from(users.values()),
            });
          }
        }
      }

      for (const [folderId, users] of folderUsers.entries()) {
        if (users.has(user._id.toString())) {
          users.delete(user._id.toString());

          if (users.size === 0) {
            folderUsers.delete(folderId);
          } else {
            io.to(`folder:${folderId}`).emit("user-left", {
              userId: user._id,
              users: Array.from(users.values()),
            });
          }
        }
      }
    });
  });
};
