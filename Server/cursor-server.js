import { WebSocketServer } from "ws";
import http from "http";
import url from "url";

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Cursor WebSocket server is running");
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Track connected clients
const documentClients = new Map();

wss.on("connection", (ws, req) => {
  const pathname = url.parse(req.url).pathname;
  const match = pathname.match(/\/cursors\/([^\/]+)/);

  if (!match) {
    ws.close(1000, "Invalid document ID in connection URL");
    return;
  }

  const documentId = match[1];
  let clientData = null;

  console.log(`New cursor connection for document: ${documentId}`);

  if (!documentClients.has(documentId)) {
    documentClients.set(documentId, new Set());
  }

  const docClients = documentClients.get(documentId);
  docClients.add(ws);

  // Handle messages
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log(
        "Received cursor message:",
        data.type,
        "from",
        data.user?.username || "unknown"
      );

      // Store client info on connect
      if (data.type === "connect" && data.user) {
        clientData = {
          userId: data.user.id,
          username: data.user.username,
          avatar: data.user.avatar,
        };
        console.log(
          `Client identified: ${clientData.username} (${clientData.userId})`
        );
        return; // Don't broadcast connect messages
      }

      // Handle cursor position updates
      if (data.type === "cursor" && clientData) {
        // Add user info to cursor data before broadcasting
        const cursorMessage = {
          ...data,
          userId: clientData.userId,
          username: clientData.username,
          avatar: clientData.avatar,
        };

        // Broadcast to all clients except sender
        docClients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(cursorMessage));
          }
        });
      }
    } catch (err) {
      console.error("Error handling cursor message:", err);
      console.error("Raw message:", message.toString());
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    console.log(`Cursor client disconnected from document: ${documentId}`);

    if (clientData) {
      // Broadcast disconnect event
      const disconnectMsg = JSON.stringify({
        type: "cursor-disconnect",
        userId: clientData.userId,
      });

      docClients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(disconnectMsg);
        }
      });
    }

    // Remove from client list
    docClients.delete(ws);

    // Clean up empty document entries
    if (docClients.size === 0) {
      documentClients.delete(documentId);
    }
  });
});

const PORT = process.env.CURSOR_PORT || 8081;
server.listen(PORT, () => {
  console.log(`Cursor WebSocket server running on port ${PORT}`);
});
