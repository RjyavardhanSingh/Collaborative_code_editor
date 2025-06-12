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

const messageSync = 0;
const messageAwareness = 1;
const messageAuth = 2;
const messageQueryAwareness = 3;

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

wss.on("connection", (conn, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const docName = url.searchParams.get("room") || "default-room";
  console.log(`New connection to document: ${docName}`);

  const doc = getYDoc(docName);
  const awareness = getAwareness(docName);
  
  conn.docName = docName;
  conn.binaryType = "arraybuffer";

  const send = (encoder) => {
    if (conn.readyState === conn.CONNECTING || conn.readyState === conn.OPEN) {
      conn.send(encoding.toUint8Array(encoder), { binary: true });
    }
  };

  const broadcastMessage = (buf, exclude) => {
    wss.clients.forEach(client => {
      if (client !== exclude && client.readyState === client.OPEN && client.docName === docName) {
        client.send(buf, { binary: true });
      }
    });
  };

  conn.on("message", (message, isBinary) => {
    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
          
          if (encoding.length(encoder) > 1) {
            send(encoder);
          }
          break;
          
        case messageAwareness:
          awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), conn);
          break;
          
        case messageQueryAwareness:
          encoding.writeVarUint(encoder, messageAwareness);
          encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys())));
          send(encoder);
          break;
      }
    } catch (err) {
      console.error(`Error handling message: ${err.message}`);
    }
  });

  const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
    const changedClients = added.concat(updated, removed);
    if (changedClients.length > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
      broadcastMessage(encoding.toUint8Array(encoder), conn);
    }
  };

  const documentUpdateHandler = (update, origin) => {
    if (origin !== conn) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      broadcastMessage(encoding.toUint8Array(encoder), conn);
    }
  };

  doc.on("update", documentUpdateHandler);
  awareness.on("update", awarenessChangeHandler);

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  send(encoder);

  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys())));
    send(encoder);
  }

  conn.on("close", () => {
    console.log(`Connection to document ${docName} closed`);
    doc.off("update", documentUpdateHandler);
    awareness.off("update", awarenessChangeHandler);
    awarenessProtocol.removeAwarenessStates(awareness, [conn.id], null);
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