import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import http from "http";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as url from "url";

dotenv.config();

const PORT = process.env.YWEBSOCKET_PORT || 1234;
const HOST = process.env.HOST || "localhost";


const docs = new Map();


const getYDoc = (docName) => {
  if (!docs.has(docName)) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    docs.set(docName, { doc, awareness });
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

  
  try {
    if (token && process.env.JWT_SECRET) {
      jwt.verify(token, process.env.JWT_SECRET);
      
    } else if (process.env.NODE_ENV !== "development") {
      console.warn("Authentication failed, closing connection");
      conn.close(1008, "Authentication failed");
      return;
    }
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    if (process.env.NODE_ENV !== "development") {
      conn.close(1008, "Authentication failed");
      return;
    }
  }

  const { doc, awareness } = getYDoc(docName);

  let connectionClosed = false;

  conn.on("message", (message) => {
    if (connectionClosed) return;

    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case 0: 
          syncProtocol.readSyncMessage(decoder, encoder, doc, null);
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
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  
  conn.on("close", () => {
    connectionClosed = true;

    awarenessProtocol.removeAwarenessStates(
      awareness,
      [conn.id],
      "connection closed"
    );
  });

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 0); 
  syncProtocol.writeSyncStep1(encoder, doc);
  conn.send(encoding.toUint8Array(encoder));

  conn.id = Math.random().toString(36).substring(2);
  awareness.on("update", ({ added, updated, removed }) => {
    const changedClients = added.concat(updated).concat(removed);
    if (changedClients.length > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 1); 
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      const message = encoding.toUint8Array(encoder);
      conn.send(message);
    }
  });

  console.log(`Client connected to document: ${docName}`);
});

server.listen(PORT, HOST, () => {
  console.log(`Y-WebSocket server running on ws://${HOST}:${PORT}`);
});
