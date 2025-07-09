import http from "http";
import ShareDB from "sharedb";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

// Configure MongoDB connection
const dbUrl =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/collaborative_code_editor";

// Create ShareDB backend with the MongoDB adapter
import { MongoClient } from "mongodb";

MongoClient.connect(dbUrl)
  .then((client) => {
    console.log("Connected to MongoDB");

    // Create a simple middleware to parse JSON streams
    const WebSocketJSONStream = (ws) => {
      return {
        read: function () {},
        write: function (chunk) {
          if (ws.readyState === 1) {
            // WebSocket.OPEN
            ws.send(JSON.stringify(chunk));
          }
        },
        end: function () {
          ws.close();
        },
        on: function (event, callback) {
          if (event === "data") {
            ws.on("message", (data) => {
              try {
                callback(JSON.parse(data.toString()));
              } catch (err) {
                console.error("Error parsing WebSocket message:", err);
              }
            });
          } else if (event === "close" || event === "end") {
            ws.on("close", callback);
          } else if (event === "error") {
            ws.on("error", callback);
          }
        },
      };
    };

    // Create ShareDB backend
    const db = client.db();
    const backend = new ShareDB({
      db: new ShareDB.MemoryDB(), // For testing - can be replaced with MongoDB adapter later
    });

    // Create HTTP server
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ShareDB WebSocket server is running");
    });

    // Create WebSocket server with explicit path
    const wss = new WebSocketServer({
      server,
      path: "/sharedb", // Match the path in the proxy
    });

    // Add a simple route handler to the HTTP server for easy testing
    server.on("request", (req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ShareDB server is running");
    });

    // Connect any incoming WebSocket connection to ShareDB
    wss.on("connection", (ws, req) => {
      // Extract document ID from URL path
      const url = new URL(req.url, `http://${req.headers.host}`);
      const documentId = url.pathname.substring(1);

      console.log(`Client connecting to document: ${documentId}`);

      // Create a WebSocket stream and connect it to ShareDB
      const stream = WebSocketJSONStream(ws);
      backend.listen(stream);

      // Handle WebSocket closing
      ws.on("close", () => {
        console.log(`Client disconnected from document: ${documentId}`);
      });

      // Handle WebSocket errors
      ws.on("error", (error) => {
        console.error(`WebSocket error: ${error.message}`);
      });
    });

    // Start server
    const PORT = process.env.SHAREDB_PORT;
    server.listen(PORT, () => {
      console.log(`ShareDB WebSocket server running on port ${PORT}`);
    });

    // Handle process termination
    process.on("SIGINT", () => {
      console.log("Shutting down ShareDB WebSocket server...");
      server.close(() => {
        console.log("Server shut down successfully");
        client.close().then(() => {
          process.exit(0);
        });
      });
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
