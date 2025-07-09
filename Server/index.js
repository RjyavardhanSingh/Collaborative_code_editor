import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import authRoutes from "./routers/auth.route.js";
import userRoutes from "./routers/user.route.js";
import documentRoutes from "./routers/document.route.js";
import versionRoutes from "./routers/version.route.js";
import messageRoutes from "./routers/message.route.js";
import searchRoutes from "./routers/search.route.js";
import analyticsRoutes from "./routers/analytics.route.js";
import { errorHandler } from "./middlewares/auth.js";
import { setupSocketHandlers } from "./socket/socket.handler.js";
import invitationRoutes from "./routers/invitation.route.js";
import folderRoutes from "./routers/folder.route.js";
import githubRoutes from "./routers/github.route.js";

dotenv.config();

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use((req, res, next) => {
  req.io = io;
  next();
});

connectDb();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/github", githubRoutes);

app.use(errorHandler);

setupSocketHandlers(io);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Collaborative Code Editor API" });
});

// Handle WebSocket routing for production environment
if (process.env.NODE_ENV === "production") {
  // Use dynamic import for http-proxy
  import("http-proxy").then((httpProxyModule) => {
    const httpProxy = httpProxyModule.default;

    httpServer.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url, "http://localhost");
      const pathname = url.pathname;

      if (pathname === "/sharedb") {
        // Forward to ShareDB WebSocket server on port 8000
        const sharedbProxy = httpProxy.createProxyServer({
          target: "ws://127.0.0.1:8000", // More reliable than localhost
          ws: true,
          changeOrigin: true,
        });

        sharedbProxy.on("error", (err) => {
          console.error("ShareDB proxy error:", err);
          socket.destroy();
        });

        sharedbProxy.web(request, socket, head);
      } else if (pathname === "/cursors") {
        // Forward to Cursor WebSocket server on port 8081
        const cursorProxy = httpProxy.createProxyServer({
          target: "ws://127.0.0.1:8081", // More reliable than localhost
          ws: true,
          changeOrigin: true,
        });

        cursorProxy.on("error", (err) => {
          console.error("Cursor proxy error:", err);
          socket.destroy();
        });

        cursorProxy.web(request, socket, head);
      } else {
        socket.destroy();
      }
    });
  });
}

httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
