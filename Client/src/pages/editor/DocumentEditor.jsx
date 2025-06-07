import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { io } from "socket.io-client";
import api from "../../lib/api.js";
import Navbar from "../../components/layout/NavBar";
import {
  FiSave,
  FiUsers,
  FiMessageSquare,
  FiClock,
  FiShare2,
  FiLock,
  FiGlobe,
  FiDownload,
  FiMaximize,
  FiMinimize,
  FiX,
} from "react-icons/fi";
import logo from "../../assets/newlogo.png";
import InvitationModal from "../../components/collaboration/InvitationModal";
import CollaboratorManagement from "../../components/collaboration/CollaboratorManagement";

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentuser } = useAuth();
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const yDocRef = useRef(null);
  const providerRef = useRef(null);
  const messageContainerRef = useRef(null);

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState(currentuser?.theme || "vs-dark");
  const [language, setLanguage] = useState("javascript");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [versions, setVersions] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);

  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/documents/${id}`);
        setDoc(data);

        const fileExtension = data.title.split(".").pop().toLowerCase();
        const detectedLanguage = getLanguageFromExtension(fileExtension);
        setLanguage(detectedLanguage);

        window.document.title = `${data.title} | DevUnity`;

        const messagesResponse = await api.get(`/api/documents/${id}/messages`);
        setMessages(messagesResponse.data);

        const versionsResponse = await api.get(`/api/documents/${id}/versions`);
        setVersions(versionsResponse.data);

        const collaboratorsData = [
          ...(data.collaborators || []),
          { user: data.owner, permission: "admin" },
        ];
        setCollaborators(collaboratorsData);

        setError(null);
      } catch (err) {
        console.error("Failed to load document:", err);
        setError(
          err.response?.data?.message ||
            "Failed to load document. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDocument();
    }

    return () => {
      if (providerRef.current) {
        providerRef.current.disconnect();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socketRef.current = io(socketUrl, {
      withCredentials: true,
      query: { documentId: id },
      auth: { token: localStorage.getItem("authToken") },
    });

    socketRef.current.emit("join-document", { documentId: id });

    socketRef.current.on("new-message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);

      if (!isChatOpen) {
        setUnreadMessageCount((prev) => prev + 1);
      }
    });

    socketRef.current.on("user-joined", ({ user, users }) => {
      setActiveUsers(users);
    });

    socketRef.current.on("user-left", ({ userId, users }) => {
      setActiveUsers(users);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [id, isChatOpen]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    if (!doc) return;

    try {
      // Initialize Y.js document
      yDocRef.current = new Y.Doc();
      const yText = yDocRef.current.getText("monaco");

      // Only insert content if yText is empty
      if (yText.toString() === "") {
        yText.insert(0, doc.content || "");
      }

      editor.updateOptions({
        readOnly: !hasWritePermission(),
      });

      const token = localStorage.getItem("authToken");
      const wsUrl =
        import.meta.env.VITE_YWEBSOCKET_URL || "ws://localhost:1234";

      const userData = {
        name: currentuser?.username || "Anonymous",
        color: getRandomColor(currentuser?._id || "default"),
        id: currentuser?._id ? String(currentuser._id) : "anonymous",
      };

      console.log("Connecting with user data:", userData);

      if (providerRef.current) {
        providerRef.current.disconnect();
      }

      providerRef.current = new WebsocketProvider(
        wsUrl,
        `document-${id}`,
        yDocRef.current,
        {
          params: { token },
          connect: true,
        }
      );

      const awareness = providerRef.current.awareness;

      console.log("Provider connected:", providerRef.current.wsconnected);

      awareness.setLocalState({
        user: userData,
        cursor: null,
      });

      console.log("Current awareness state:", awareness.getLocalState());
      console.log(
        "All awareness states:",
        Array.from(awareness.getStates().entries())
      );

      // Create Monaco binding with proper configuration
      new MonacoBinding(
        yText,
        editor.getModel(),
        new Set([editor]),
        awareness,
        {
          // Optional: set cursor style
          cursorStyle: "line",
          // Enable awareness of remote cursors
          awareness: true,
        }
      );

      const remoteCursorDecorations = new Map();

      let lastCursorUpdateTime = 0;
      editor.onDidChangeCursorPosition((e) => {
        const now = Date.now();
        if (now - lastCursorUpdateTime < 50) return;
        lastCursorUpdateTime = now;

        const model = editor.getModel();
        if (!model) return;

        const position = e.position;
        const offset = model.getOffsetAt(position);

        awareness.setLocalStateField("cursor", {
          index: offset,
          head: offset,
          anchor: offset,
        });
      });

      awareness.on("change", () => {
        const model = editor.getModel();
        if (!model) return;

        console.log("Awareness change detected!");
        console.log("All states:", Array.from(awareness.getStates().entries()));

        // Clear previous decorations
        editor.deltaDecorations(
          Array.from(remoteCursorDecorations.values()).flat(),
          []
        );
        remoteCursorDecorations.clear();

        // Add decorations for each remote user
        awareness.getStates().forEach((state, clientId) => {
          if (clientId !== awareness.clientID && state.user && state.cursor) {
            console.log(
              `Rendering cursor for user: ${state.user.name} at position: ${state.cursor.index}`
            );

            // Ensure style is added
            addRemoteCursorStyle(clientId, state.user.color);

            try {
              const position = model.getPositionAt(state.cursor.index);

              // Create more visible decorations with z-index
              const decorations = [];

              // Cursor line
              decorations.push({
                range: new monaco.Range(
                  position.lineNumber,
                  position.column,
                  position.lineNumber,
                  position.column + 1
                ),
                options: {
                  className: `remote-cursor-${clientId}`,
                  hoverMessage: { value: state.user.name },
                  stickiness:
                    monaco.editor.TrackedRangeStickiness
                      .NeverGrowsWhenTypingAtEdges,
                  zIndex: 100,
                },
              });

              // Flag with username
              decorations.push({
                range: new monaco.Range(
                  position.lineNumber,
                  position.column,
                  position.lineNumber,
                  position.column
                ),
                options: {
                  beforeContentClassName: `remote-cursor-${clientId}-before`,
                  afterContentClassName: `remote-cursor-${clientId}-flag`,
                  afterContent: state.user.name,
                  stickiness:
                    monaco.editor.TrackedRangeStickiness
                      .NeverGrowsWhenTypingAtEdges,
                  zIndex: 1000,
                },
              });

              // Apply decorations and store IDs
              const ids = editor.deltaDecorations([], decorations);
              remoteCursorDecorations.set(clientId, ids);

              console.log(
                `Applied cursor decoration for ${state.user.name} at line ${position.lineNumber}, column ${position.column}`
              );
            } catch (err) {
              console.error("Error rendering remote cursor:", err);
            }
          }
        });
      });

      console.log("Y.js collaborative editing initialized successfully");
    } catch (err) {
      console.error("Failed to initialize collaborative editing:", err);
    }
  };

  const getRandomColor = (userId) => {
    const colors = [
      "#F87171",
      "#FB923C",
      "#FBBF24",
      "#A3E635",
      "#34D399",
      "#22D3EE",
      "#818CF8",
      "#C084FC",
    ];

    const hash = userId?.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  };

  const hasWritePermission = () => {
    if (!doc || !currentuser) return false;

    if (doc.owner._id === currentuser._id) return true;

    const collaborator = doc.collaborators?.find(
      (c) => c.user._id === currentuser._id
    );

    return (
      collaborator &&
      (collaborator.permission === "write" ||
        collaborator.permission === "admin")
    );
  };

  const handleSave = async () => {
    if (!hasWritePermission()) return;

    try {
      setIsSaving(true);
      const content = editorRef.current.getValue();

      await api.put(`/api/documents/${id}`, {
        content,
        language,
      });

      await api.post(`/api/documents/${id}/versions`, {
        content,
        message: "Manual save",
      });

      setLastSaved(new Date());

      const versionsResponse = await api.get(`/api/documents/${id}/versions`);
      setVersions(versionsResponse.data);

      setIsSaving(false);
    } catch (err) {
      console.error("Failed to save document:", err);
      setIsSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await api.post(`/api/documents/${id}/messages`, {
        content: newMessage,
      });

      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    if (!hasWritePermission()) return;

    try {
      setLanguage(newLanguage);

      await api.put(`/api/documents/${id}`, {
        language: newLanguage,
      });
    } catch (err) {
      console.error("Failed to update language:", err);
    }
  };

  const handleRestoreVersion = async (versionId) => {
    if (!hasWritePermission()) return;

    try {
      setLoading(true);

      await api.post(`/api/documents/${id}/restore/${versionId}`);

      const { data } = await api.get(`/api/documents/${id}`);
      setDoc(data);

      if (editorRef.current) {
        editorRef.current.setValue(data.content);
      }

      setIsVersionHistoryOpen(false);
    } catch (err) {
      console.error("Failed to restore version:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShareDocument = () => {
    setIsChatOpen(false);
    setIsCollaboratorsOpen(false);
    setIsVersionHistoryOpen(false);
    setIsInvitationModalOpen(true);
  };

  const handleTogglePublic = async () => {
    if (!hasWritePermission()) return;

    try {
      await api.put(`/api/documents/${id}`, {
        isPublic: !doc.isPublic,
      });

      setDoc({
        ...doc,
        isPublic: !doc.isPublic,
      });
    } catch (err) {
      console.error("Failed to update document visibility:", err);
    }
  };

  const handleExport = () => {
    if (!editorRef.current) return;

    const content = editorRef.current.getValue();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    const container = document.getElementById("editor-container");

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }

    setIsFullscreen(!isFullscreen);
  };

  const getLanguageFromExtension = (ext) => {
    const extensionMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      py: "python",
      java: "java",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
      go: "go",
      rs: "rust",
      php: "php",
      rb: "ruby",
      md: "markdown",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      xml: "xml",
      sql: "sql",
      txt: "plaintext",
    };

    return extensionMap[ext] || "plaintext";
  };

  const handleOpenChat = () => {
    setIsCollaboratorsOpen(false);
    setIsVersionHistoryOpen(false);
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadMessageCount(0);
    }
  };

  useEffect(() => {
    if (messageContainerRef.current && isChatOpen) {
      const scrollHeight = messageContainerRef.current.scrollHeight;
      messageContainerRef.current.scrollTo({
        top: scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isChatOpen]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (activeUsers.length > 0) {
        const count = activeUsers.length;
        window.document.title = `${doc?.title} (${count} active) | DevUnity`;
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeUsers, doc]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-300">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-500 text-xl font-bold mb-4">Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const addRemoteCursorStyle = (clientId, color) => {
    const styleId = `remote-cursor-${clientId}-style`;

    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.parentNode.removeChild(existingStyle);
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      .remote-cursor-${clientId} {
        position: relative;
        border-left: 4px solid ${color} !important;
        z-index: 100 !important;
      }
      .remote-cursor-${clientId}-before {
        position: absolute;
        border-left: 4px solid ${color} !important;
        height: 100%;
        z-index: 100 !important;
      }
      .remote-cursor-${clientId}-flag {
        position: absolute;
        left: -2px;
        top: -20px;
        font-size: 12px;
        padding: 2px 6px;
        line-height: 16px;
        background-color: ${color} !important;
        color: white !important;
        z-index: 1000 !important;
        white-space: nowrap;
        border-radius: 3px;
        font-weight: bold;
        pointer-events: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
      }
    `;
    document.head.appendChild(style);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar
        showBackButton={true}
        title={doc?.title || "Untitled Document"}
        actions={
          <>
            <div className="text-xs text-slate-400 ml-4">
              {lastSaved
                ? `Last saved ${new Date(lastSaved).toLocaleTimeString()}`
                : ""}
            </div>

            <select
              value={language}
              className="ml-4 bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
              disabled={true}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="csharp">C#</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
              <option value="rust">Rust</option>
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
            </select>

            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
            >
              <option value="vs-dark">Dark</option>
              <option value="light">Light</option>
              <option value="hc-black">High Contrast</option>
            </select>

            <button
              onClick={handleSave}
              disabled={isSaving || !hasWritePermission()}
              className={`flex items-center px-3 py-1 rounded text-sm font-medium ${
                hasWritePermission()
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              } transition-colors`}
            >
              <FiSave className="mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </button>

            <button
              onClick={() => {
                setIsChatOpen(false);
                setIsVersionHistoryOpen(false);
                setIsCollaboratorsOpen(!isCollaboratorsOpen);
              }}
              className={`p-2 rounded ${
                isCollaboratorsOpen
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title="Collaborators"
            >
              <FiUsers />
            </button>

            <button
              onClick={handleOpenChat}
              className={`p-2 rounded relative ${
                isChatOpen
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title="Chat"
            >
              <FiMessageSquare />
              {unreadMessageCount > 0 && !isChatOpen && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsVersionHistoryOpen(!isVersionHistoryOpen)}
              className={`p-2 rounded ${
                isVersionHistoryOpen
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title="Version History"
            >
              <FiClock />
            </button>

            <button
              onClick={handleShareDocument}
              disabled={!hasWritePermission()}
              className={`p-2 rounded ${
                hasWritePermission()
                  ? "text-slate-400 hover:text-white hover:bg-slate-700"
                  : "text-slate-600 cursor-not-allowed"
              }`}
              title="Share Document"
            >
              <FiShare2 />
            </button>

            <button
              onClick={handleTogglePublic}
              disabled={!hasWritePermission()}
              className={`p-2 rounded ${
                hasWritePermission()
                  ? "text-slate-400 hover:text-white hover:bg-slate-700"
                  : "text-slate-600 cursor-not-allowed"
              }`}
              title={doc?.isPublic ? "Make Private" : "Make Public"}
            >
              {doc?.isPublic ? <FiGlobe /> : <FiLock />}
            </button>

            <button
              onClick={handleExport}
              className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-700"
              title="Export Document"
            >
              <FiDownload />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-700"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <FiMinimize /> : <FiMaximize />}
            </button>
          </>
        }
      />

      <div className="flex flex-1 relative" id="editor-container">
        <div className="flex-1 relative bg-white">
          <Editor
            height="100%"
            width="100%"
            defaultLanguage={language}
            language={language}
            theme={theme}
            onMount={handleEditorDidMount}
            defaultValue={doc?.content || ""}
            options={{
              fontSize: 14,
              minimap: { enabled: true },
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              lineNumbers: "on",
              folding: true,
              readOnly: !hasWritePermission(),
            }}
          />
        </div>
        {isCollaboratorsOpen && (
          <CollaboratorManagement
            documentId={id}
            collaborators={collaborators}
            setCollaborators={setCollaborators}
            activeUsers={activeUsers}
            currentuser={currentuser}
            onClose={() => setIsCollaboratorsOpen(false)}
            onInviteClick={handleShareDocument}
          />
        )}

        {isChatOpen && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute top-0 right-0 h-full w-[300px] border-l border-slate-700 bg-slate-800 flex flex-col shadow-xl z-10"
          >
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-white font-bold">Chat</h2>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <FiX />
              </button>
            </div>

            <div
              ref={messageContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${
                      message.sender._id === currentuser?._id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender._id === currentuser?._id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-white"
                      }`}
                    >
                      {message.sender._id !== currentuser?._id && (
                        <div className="text-xs text-slate-300 mb-1">
                          {message.sender.username}
                        </div>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <div className="text-xs opacity-70 mt-1 text-right">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-8">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700">
              <div className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-700 text-white rounded-l px-3 py-2 focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-blue-600 text-white px-3 py-2 rounded-r hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {isVersionHistoryOpen && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute top-0 right-0 h-full w-[300px] border-l border-slate-700 bg-slate-800 overflow-y-auto shadow-xl z-10"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold">Version History</h2>
                <button
                  onClick={() => setIsVersionHistoryOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <FiX />
                </button>
              </div>

              <div className="space-y-4">
                {versions.length > 0 ? (
                  versions.map((version) => (
                    <div
                      key={version._id}
                      className="bg-slate-700/50 rounded p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-white text-sm font-medium">
                            {version.message || "Version update"}
                          </div>
                          <div className="text-slate-400 text-xs">
                            By {version.createdBy.username} •{" "}
                            {new Date(version.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {hasWritePermission() && (
                        <div className="mt-2 flex space-x-2">
                          <button
                            onClick={() => handleRestoreVersion(version._id)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => {
                              if (editorRef.current) {
                                const viewState =
                                  editorRef.current.saveViewState();
                                editorRef.current.setValue(version.content);
                                editorRef.current.restoreViewState(viewState);
                              }
                            }}
                            className="text-xs bg-slate-600 text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors"
                          >
                            Preview
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    No version history available.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {isInvitationModalOpen && (
          <InvitationModal
            documentId={id}
            onClose={() => setIsInvitationModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
