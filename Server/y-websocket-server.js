import http from "http";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.YWEBSOCKET_PORT || 1234;
const HOST = process.env.HOST || "localhost";

const docs = new Map();
const awarenessMap = new Map();

const getYDoc = (docName) => {
  let doc = docs.get(docName);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(docName, doc);
  }
  return doc;
};

const getAwareness = (docName) => {
  let awareness = awarenessMap.get(docName);
  if (!awareness) {
    awareness = new awarenessProtocol.Awareness(getYDoc(docName));
    awarenessMap.set(docName, awareness);
  }
  return awareness;
};

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Y.js WebSocket Server is running");
});

const wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
  maxPayload: 1024 * 1024 * 10,
});

const broadcastMessage = (docName, message, exclude) => {
  wss.clients.forEach((client) => {
    if (
      client !== exclude &&
      client.readyState === 1 &&
      client.docName === docName
    ) {
      client.send(message, { binary: true });
    }
  });
};

wss.on("connection", (conn, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const docName = url.searchParams.get("room") || "default-room";

  const doc = getYDoc(docName);
  const awareness = getAwareness(docName);

  conn.docName = docName;
  conn.id = Math.random().toString(36).substring(2);

  console.log(`New connection to document ${docName}, client ID: ${conn.id}`);

  const send = (encoder) => {
    if (conn.readyState === 1) {
      const message = encoding.toUint8Array(encoder);
      conn.send(message, { binary: true });
    }
  };

  const sendSyncStep1 = () => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0); // sync message type
    syncProtocol.writeSyncStep1(encoder, doc);
    send(encoder);
  };

  const sendSyncStep2 = (encoder) => {
    const responseEncoder = encoding.createEncoder();
    encoding.writeVarUint(responseEncoder, 0); // sync message type
    syncProtocol.writeSyncStep2(responseEncoder, doc, encoder);
    send(responseEncoder);
  };

  conn.on("message", (message) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case 0: // sync
          const syncMessageType = syncProtocol.readSyncMessage(
            decoder,
            null,
            doc,
            conn
          );

          if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
            sendSyncStep2(decoder);
          } else if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
            // Step 2 received, document is now synchronized
            console.log(
              `Document ${docName} synchronized for client ${conn.id}`
            );
          } else if (syncMessageType === syncProtocol.messageYjsUpdate) {
            // Forward update to other clients
            const update = decoding.readVarUint8Array(decoder);
            const updateEncoder = encoding.createEncoder();
            encoding.writeVarUint(updateEncoder, 0);
            syncProtocol.writeUpdate(updateEncoder, update);
            broadcastMessage(
              docName,
              encoding.toUint8Array(updateEncoder),
              conn
            );
          }
          break;

        case 1: // awareness
          const awarenessUpdate = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            awarenessUpdate,
            conn
          );

          // Broadcast awareness update to other clients
          const awarenessEncoder = encoding.createEncoder();
          encoding.writeVarUint(awarenessEncoder, 1);
          encoding.writeVarUint8Array(awarenessEncoder, awarenessUpdate);
          broadcastMessage(
            docName,
            encoding.toUint8Array(awarenessEncoder),
            conn
          );
          break;

        case 3: // queryAwareness
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 1);
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(
              awareness,
              Array.from(awareness.getStates().keys())
            )
          );
          send(encoder);
          break;
      }
    } catch (err) {
      console.error(
        `Error handling message from client ${conn.id}:`,
        err.message
      );
    }
  });

  const documentUpdateHandler = (update, origin) => {
    if (origin !== conn) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      syncProtocol.writeUpdate(encoder, update);
      send(encoder);
    }
  };

  const awarenessUpdateHandler = ({ added, updated, removed }) => {
    const changedClients = added.concat(updated, removed);
    if (changedClients.length > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 1);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      send(encoder);
    }
  };

  // Register event handlers
  doc.on("update", documentUpdateHandler);
  awareness.on("update", awarenessUpdateHandler);

  // Send initial sync message
  sendSyncStep1();

  // Send current awareness states
  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 1);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awarenessStates.keys())
      )
    );
    send(encoder);
  }

  conn.on("close", () => {
    console.log(
      `Connection to document ${docName} closed for client ${conn.id}`
    );
    doc.off("update", documentUpdateHandler);
    awareness.off("update", awarenessUpdateHandler);
    awarenessProtocol.removeAwarenessStates(awareness, [conn.id], null);
  });

  conn.on("error", (error) => {
    console.error(`WebSocket error for client ${conn.id}:`, error);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Y.js WebSocket server running on ws://${HOST}:${PORT}`);
});

process.on("SIGINT", () => {
  wss.clients.forEach((client) => {
    client.close(1001, "Server shutting down");
  });
  server.close(() => {
    process.exit(0);
  });
});

export default server;
