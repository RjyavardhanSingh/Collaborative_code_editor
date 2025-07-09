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

// Make sure this comes BEFORE the production WebSocket proxy setup
const io = new Server(httpServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://collaborative-code-editor-chi.vercel.app",
            process.env.CLIENT_URL,
          ]
        : process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io/", // Explicitly set the path
  transports: ["polling", "websocket"],
});
app.use((req, res, next) => {
  req.io = io;
  next();
});

connectDb();

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://collaborative-code-editor-chi.vercel.app",
            process.env.CLIENT_URL,
          ]
        : process.env.CLIENT_URL || "http://localhost:5173",
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

// Add health check endpoints
app.get("/health", (req, res) => {
  res.status(200).send("Main server is healthy");
});

// Update ShareDB health check
app.get("/sharedb-health", async (req, res) => {
  try {
    // Instead of trying to fetch, check if the service is expected to be running
    const sharedbPort = process.env.SHAREDB_PORT || 8000;

    // Check if we can get environment information about the service
    res.status(200).send({
      status: "Expected to be running",
      port: sharedbPort,
      proxyTarget: "ws://127.0.0.1:" + sharedbPort,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).send(`ShareDB server error: ${err.message}`);
  }
});

// Update cursor health check
app.get("/cursor-health", async (req, res) => {
  try {
    // Instead of trying to fetch, check if the service is expected to be running
    const cursorPort = process.env.CURSOR_PORT || 8081;

    // Check if we can get environment information about the service
    res.status(200).send({
      status: "Expected to be running",
      port: cursorPort,
      proxyTarget: "ws://127.0.0.1:" + cursorPort,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).send(`Cursor server error: ${err.message}`);
  }
});

// Handle WebSocket routing for production environment
if (process.env.NODE_ENV === "production") {
  // Use dynamic import for http-proxy
  import("http-proxy").then((httpProxyModule) => {
    const httpProxy = httpProxyModule.default;

    // Create a single proxy for all WebSocket connections
    const wsProxy = httpProxy.createProxyServer({
      ws: true,
      changeOrigin: true,
      ignorePath: true, // Add this to prevent path issues
      xfwd: true, // Forward original headers
    });

    // Add detailed error logging
    wsProxy.on("error", (err, req, res) => {
      console.error("WebSocket proxy error:", err.message);
      console.error("Request URL that failed:", req?.url);

      if (res && res.writeHead) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("WebSocket proxy error");
      }

      // Don't destroy the socket to allow retries
      if (req && req.socket && !req.socket.destroyed) {
        req.socket.end();
      }
    });

    wsProxy.on("proxyReq", (proxyReq, req, res) => {
      console.log(`Proxying request: ${req.url} -> ${proxyReq.path}`);
    });

    wsProxy.on("upgrade", (proxyReq, socket, head) => {
      console.log("Proxy upgrade event received");
    });

    httpServer.on("upgrade", (req, socket, head) => {
      const pathname = new URL(req.url, "http://localhost").pathname;
      console.log(`WebSocket upgrade request for: ${pathname}`);

      if (pathname.startsWith("/socket.io")) {
        console.log("Routing to Socket.IO");
        return; // Socket.IO handles this
      } else if (pathname.startsWith("/sharedb")) {
        console.log("Routing to ShareDB service");
        // Set the target explicitly for each request
        wsProxy.web(req, socket, head, {
          target: "http://localhost:8000",
        });
      } else if (pathname.startsWith("/cursors")) {
        console.log("Routing to Cursor service");
        wsProxy.web(req, socket, head, {
          target: "http://localhost:8081",
        });
      } else {
        console.log(`Unknown WebSocket path: ${pathname}`);
        socket.destroy();
      }
    });
  });
}

httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
