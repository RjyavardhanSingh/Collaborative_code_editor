import http from "http";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import { setupWSConnection } from "y-websocket/bin/utils";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.YWEBSOCKET_PORT || 1234;
const HOST = process.env.HOST || "localhost";

const docs = new Map();

const getYDoc = (docName) => {
  let doc = docs.get(docName);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(docName, doc);
  }
  return doc;
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

  const doc = getYDoc(docName);

  setupWSConnection(conn, req, {
    docName,
    gc: true,
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
