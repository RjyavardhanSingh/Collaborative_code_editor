import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import http from "http";
import * as url from "url";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";

dotenv.config();

const PORT = process.env.YWEBSOCKET_PORT || 1234;
const HOST = process.env.HOST || "localhost";

const docs = new Map();

const getYDoc = (docName) => {
  if (!docs.has(docName)) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);

    docs.set(docName, {
      doc,
      awareness,
      connections: new Set(),
    });
  }
  return docs.get(docName);
};

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Y-WebSocket server running");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (conn, req) => {
  const parsedUrl = url.parse(req.url, true);
  const docName = parsedUrl.pathname.slice(1);
  const token = parsedUrl.query.token;

  console.log(`New connection for document: ${docName}`);

  try {
    if (token && process.env.JWT_SECRET) {
      jwt.verify(token, process.env.JWT_SECRET);
    }
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    if (process.env.NODE_ENV !== "development") {
      conn.close(1008, "Authentication failed");
      return;
    }
  }

  const { doc, awareness, connections } = getYDoc(docName);

  connections.add(conn);
  conn.docName = docName;

  const broadcastMessage = (message, excludeConn = null) => {
    connections.forEach((c) => {
      if (c !== excludeConn && c.readyState === 1) {
        try {
          c.send(message);
        } catch (err) {
          console.error("Error broadcasting message:", err);
          connections.delete(c);
        }
      }
    });
  };

  const updateHandler = (update, origin) => {
    if (origin !== conn) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      broadcastMessage(message, origin);
    }
  };

  const awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
    if (origin !== conn) {
      const changedClients = added.concat(updated).concat(removed);
      if (changedClients.length > 0) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 1);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        const message = encoding.toUint8Array(encoder);
        broadcastMessage(message, origin);
      }
    }
  };

  doc.on("update", updateHandler);
  awareness.on("update", awarenessUpdateHandler);

  conn.on("message", (message) => {
    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case 0:
          syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
          if (encoding.length(encoder) > 1) {
            conn.send(encoding.toUint8Array(encoder));
          }
          break;
        case 1:
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            conn
          );
          break;
        default:
          console.warn(`Unknown message type: ${messageType}`);
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  conn.on("close", () => {
    console.log(`Connection closed for document: ${docName}`);
    connections.delete(conn);
    doc.off("update", updateHandler);
    awareness.off("update", awarenessUpdateHandler);
    awarenessProtocol.removeAwarenessStates(awareness, [conn], null);
  });

  conn.on("error", (error) => {
    console.error("WebSocket error:", error);
    connections.delete(conn);
  });

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 0);
  syncProtocol.writeSyncStep1(encoder, doc);
  if (encoding.length(encoder) > 1) {
    conn.send(encoding.toUint8Array(encoder));
  }

  if (awareness.getStates().size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 1);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awareness.getStates().keys())
      )
    );
    if (encoding.length(encoder) > 1) {
      conn.send(encoding.toUint8Array(encoder));
    }
  }

  console.log(
    `Client connected to document: ${docName}, total connections: ${connections.size}`
  );
});

server.listen(PORT, HOST, () => {
  console.log(`Y-WebSocket server running on ws://${HOST}:${PORT}`);
});
