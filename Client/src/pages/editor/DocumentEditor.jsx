import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
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
  FiChevronLeft,
  FiChevronRight,
  FiFolder,
  FiFile,
} from "react-icons/fi";
import InvitationModal from "../../components/collaboration/InvitationModal";
import CollaboratorManagement from "../../components/collaboration/CollaboratorManagement";
import { Connection } from "sharedb/lib/client";
import ReconnectingWebSocket from "reconnecting-websocket";
import { MonacoShareDBBinding } from "../../lib/MonacoShareDBBinding";
import { io } from "socket.io-client";
import FileExplorer from "../../components/explorer/FileExplorer";

const addRemoteCursorStyle = (clientId, color, name) => {
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
      border-left: 2px solid ${color} !important;
      background-color: ${color}20 !important;
    }
    
    .remote-cursor-${clientId}::before {
      content: '';
      position: absolute !important;
      left: -2px !important;
      top: 0 !important;
      width: 2px !important;
      height: 100% !important;
      background-color: ${color} !important;
      z-index: 1000 !important;
    }
    
    .remote-cursor-${clientId}::after {
      content: '${name}';
      position: absolute !important;
      left: -2px !important;
      top: -20px !important;
      background-color: ${color} !important;
      color: white !important;
      font-size: 10px !important;
      padding: 2px 6px !important;
      border-radius: 3px !important;
      white-space: nowrap !important;
      pointer-events: none !important;
      z-index: 1001 !important;
    }
  `;

  document.head.appendChild(style);
};

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentuser } = useAuth();
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const shareDBConnectionRef = useRef(null);
  const shareDBDocRef = useRef(null);
  const bindingRef = useRef(null);
  // Add this missing ref
  const cursorSocketRef = useRef(null);
  const messageContainerRef = useRef(null);
  const isCollaborativeInitialized = useRef(false);
  const persistedContentRef = useRef(null);
  const syncCompleted = useRef(false);
  const cursorTrackingRef = useRef(null);
  const remoteCursorDecorations = useRef(new Map());
  const syncIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

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
  const [connectedUsers, setConnectedUsers] = useState(new Map());

  // Add this state to track folder context
  const [currentFolder, setCurrentFolder] = useState(null);
  const [showAllFiles, setShowAllFiles] = useState(true);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/documents/${id}`);
        setDoc(data);
        persistedContentRef.current = data.content || "";

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

        // Set the folder context if the document is in a folder
        if (data.folder) {
          setCurrentFolder(data.folder);
          setShowAllFiles(false);
        }

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
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      if (shareDBDocRef.current) {
        shareDBDocRef.current.destroy();
      }
      if (shareDBConnectionRef.current) {
        shareDBConnectionRef.current.close();
      }
      // Updated cleanup for cursor tracking
      if (cursorTrackingRef.current) {
        cursorTrackingRef.current.cleanup();
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

      // Add this code to update connectedUsers map
      const updatedUsers = new Map(connectedUsers);
      users.forEach((u) => {
        if (!updatedUsers.has(u._id) && u._id !== currentuser?._id) {
          updatedUsers.set(u._id, {
            id: u._id,
            username: u.username,
            color: getRandomColor(u._id),
          });
        }
      });
      setConnectedUsers(updatedUsers);
    });

    socketRef.current.on("user-left", ({ userId, users }) => {
      setActiveUsers(users);

      // Add this code to remove disconnected user
      setConnectedUsers((prev) => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [id, isChatOpen]);

  const initializeCollaborativeEditor = async (editor) => {
    if (isCollaborativeInitialized.current || !doc) return;

    console.log("🚀 Initializing collaborative editor with ShareDB...");

    try {
      // Clean up existing connections
      cleanupConnections();

      const wsUrl = import.meta.env.VITE_SHAREDB_URL || "ws://localhost:8080";
      const roomName = `document-${id}`;

      console.log(`🔌 Connecting to ShareDB: ${wsUrl}/${roomName}`);

      // Create reconnecting WebSocket for ShareDB (document sync)
      const shareDBSocket = new ReconnectingWebSocket(`${wsUrl}/${roomName}`);

      // Create ShareDB connection with the ShareDB socket
      shareDBConnectionRef.current = new Connection(shareDBSocket);

      // Get the document from ShareDB
      const shareDoc = shareDBConnectionRef.current.get("documents", id);
      shareDBDocRef.current = shareDoc;

      // Subscribe to the document
      shareDoc.subscribe(function (err) {
        if (err) {
          console.error("ShareDB subscription error:", err);
          return;
        }

        console.log("✅ Subscribed to ShareDB document");

        // Create or load the document
        if (!shareDoc.type) {
          // Document doesn't exist, create it with the initial content
          const initialContent = persistedContentRef.current || "";
          shareDoc.create(
            { content: initialContent, language: language },
            function (err) {
              if (err) {
                console.error("ShareDB document creation error:", err);
                return;
              }

              console.log("📄 Document created in ShareDB");
              createBinding(editor, shareDoc);
            }
          );
        } else {
          console.log("📄 Document loaded from ShareDB");

          // Update local content if needed
          if (shareDoc.data && shareDoc.data.content !== undefined) {
            persistedContentRef.current = shareDoc.data.content;
            editor.setValue(shareDoc.data.content);
          } else if (persistedContentRef.current) {
            // Update the document with our content
            shareDoc.submitOp([
              { p: ["content"], oi: persistedContentRef.current },
            ]);
          }

          createBinding(editor, shareDoc);
        }
      });
    } catch (error) {
      console.error("❌ Failed to initialize collaborative editor:", error);
    }
  };

  const createBinding = (editor, shareDoc) => {
    try {
      console.log("🔗 Creating Monaco-ShareDB binding...");

      // Create a new binding with our custom class
      bindingRef.current = new MonacoShareDBBinding(shareDoc, editor);

      console.log("✅ Monaco-ShareDB binding created");

      // Initialize auto-save
      initializeAutoSave(shareDoc);

      // Add this line to initialize cursor tracking
      setupCursorTracking(editor);

      isCollaborativeInitialized.current = true;
      console.log("🎉 Collaborative editor fully initialized");
    } catch (err) {
      console.error("❌ Error creating binding:", err);
    }
  };

  // Simplified auto-save function
  const initializeAutoSave = (shareDoc) => {
    let saveTimeout = null;
    let lastSavedContent = "";

    const autoSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout);

      console.log("📝 Document changed, scheduling auto-save");

      saveTimeout = setTimeout(async () => {
        try {
          if (!hasWritePermission()) return;

          const content = shareDoc.data?.content || "";
          if (content === lastSavedContent) return;

          console.log("💾 Auto-saving document...");

          await api.put(`/api/documents/${id}`, { content, language });
          lastSavedContent = content;
          persistedContentRef.current = content;
          setLastSaved(new Date());

          console.log("✅ Auto-save completed");
        } catch (error) {
          console.error("❌ Auto-save failed:", error);
        }
      }, 1500);
    };

    // Listen for ShareDB operations
    shareDoc.on("op", (op, source) => {
      autoSave();
    });

    autoSaveTimeoutRef.current = saveTimeout;
  };

  // CRITICAL FIX: Update your Y.js WebSocket server URL handling
  // Make sure your WebSocket server is running on the correct URL
  const cleanupConnections = () => {
    try {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (shareDBDocRef.current) {
        shareDBDocRef.current.destroy();
        shareDBDocRef.current = null;
      }
      if (shareDBConnectionRef.current) {
        shareDBConnectionRef.current.close();
        shareDBConnectionRef.current = null;
      }
      if (cursorTrackingRef.current) {
        cursorTrackingRef.current.cleanup();
        cursorTrackingRef.current = null;
      }

      // Add null check for cursorSocketRef
      if (
        cursorSocketRef.current &&
        cursorSocketRef.current.readyState === WebSocket.OPEN
      ) {
        cursorSocketRef.current.close();
        cursorSocketRef.current = null;
      }

      // Clean up cursor styles
      document
        .querySelectorAll('[id^="remote-cursor-"]')
        .forEach((el) => el.remove());

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }

      isCollaborativeInitialized.current = false;
    } catch (error) {
      console.error("❌ Cleanup error:", error);
    }
  };

  const handleEditorDidMount = async (editor, monaco) => {
    editorRef.current = editor;
    window.monaco = monaco;

    // Set editor options
    editor.updateOptions({
      readOnly: !hasWritePermission(),
      fontSize: 14,
      minimap: { enabled: true },
      automaticLayout: true,
      tabSize: 2,
      wordWrap: "on",
      lineNumbers: "on",
      folding: true,
    });

    // Set initial content
    if (persistedContentRef.current) {
      editor.setValue(persistedContentRef.current);
    }

    // Initialize collaborative editing
    await initializeCollaborativeEditor(editor);
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

    // Check if user is the document owner
    if (doc.owner === currentuser._id || doc.owner?._id === currentuser._id) {
      return true;
    }

    // For global files (not in a folder), check document-level permissions
    if (!doc.folder) {
      // Check if user is a collaborator with write permission
      const collaborator = doc.collaborators?.find(
        (c) => c.user === currentuser._id || c.user?._id === currentuser._id
      );

      return (
        collaborator?.permission === "write" ||
        collaborator?.permission === "admin"
      );
    }

    // For files in a folder, check folder-level permissions
    if (currentFolder) {
      // Check if user is folder owner
      if (
        currentFolder.owner === currentuser._id ||
        currentFolder.owner?._id === currentuser._id
      ) {
        return true;
      }

      // Check if user is a folder collaborator with write permission
      const folderCollaborator = currentFolder.collaborators?.find(
        (c) => c.user === currentuser._id || c.user?._id === currentuser._id
      );

      return (
        folderCollaborator?.permission === "write" ||
        folderCollaborator?.permission === "admin"
      );
    }

    // Fallback: check document-level permissions
    const collaborator = doc.collaborators?.find(
      (c) => c.user === currentuser._id || c.user?._id === currentuser._id
    );

    return (
      collaborator?.permission === "write" ||
      collaborator?.permission === "admin"
    );
  };

  const handleSave = async () => {
    if (!hasWritePermission()) return;

    try {
      setIsSaving(true);
      const content = editorRef.current.getValue();

      await api.put(`/api/documents/${id}`, { content, language });
      await api.post(`/api/documents/${id}/versions`, {
        content,
        message: "Manual save",
      });

      persistedContentRef.current = content;
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
      await api.put(`/api/documents/${id}`, { language: newLanguage });
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
      persistedContentRef.current = data.content || "";

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

      setDoc({ ...doc, isPublic: !doc.isPublic });
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

  // Add this to your state variables
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);

  // Add this function to handle file selection from explorer
  const handleFileSelect = (file) => {
    // If it's the current document, do nothing
    if (file._id === id) return;

    // Navigate to the selected file
    navigate(`/documents/${file._id}`);
  };

  // Add this to your DocumentEditor.jsx component
  const forceYjsSync = (editor, yText) => {
    if (!editor || !yText) return;
    console.log("🔄 Force-syncing content between Y.js and Monaco");

    const yContent = yText.toString();
    const editorContent = editor.getValue();

    // Only update if content actually differs
    if (yContent !== editorContent) {
      console.log("⚠️ Content mismatch detected, syncing...");

      try {
        // First try to update Y.js if editor has newer content
        // This helps when local changes haven't been sent yet
        if (
          editorContent.length > yContent.length &&
          (!yDocRef.current._transaction || !providerRef.current.synced)
        ) {
          console.log("📤 Updating Y.js from editor");
          yDocRef.current.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, editorContent);
          });
        }
        // Otherwise update editor from Y.js (more common case)
        else {
          console.log("📥 Updating editor from Y.js");
          // Use Monaco's executeEdits to properly handle undo/redo stack
          editor.executeEdits("yjs-sync", [
            {
              range: editor.getModel().getFullModelRange(),
              text: yContent,
              forceMoveMarkers: true,
            },
          ]);
        }
        console.log("✅ Force sync completed");
      } catch (err) {
        console.error("❌ Force sync failed:", err);
      }
    }
  };

  const setupCursorTracking = (editor) => {
    console.log("👁️ Setting up cursor tracking with Socket.IO...");

    if (!socketRef.current) {
      console.warn(
        "⚠️ No Socket.IO connection available - cursor tracking disabled"
      );
      return;
    }

    // Map to store cursor decorations by user ID
    const userCursors = new Map();

    // Add this listener for cursor restoration events
    const cursorRestoreHandler = (event) => {
      const { cursors } = event.detail;

      cursors.forEach((cursor) => {
        const existingCursor = userCursors.get(cursor.userId);
        if (existingCursor) {
          // Restore the cursor at the saved line
          const position = existingCursor.position;
          if (position && cursor.lineNumber) {
            // Update line number but keep column position
            position.selection.startLineNumber = cursor.lineNumber;
            position.selection.endLineNumber = cursor.lineNumber;

            // Re-apply the cursor
            updateUserCursor(
              cursor.userId,
              existingCursor.username,
              existingCursor.color,
              position
            );
          }
        }
      });
    };

    document.addEventListener("restore-remote-cursors", cursorRestoreHandler);

    // Track and send cursor position
    const sendCursorPosition = () => {
      try {
        if (!socketRef.current || !socketRef.current.connected) return;

        const position = editor.getPosition();
        const selection = editor.getSelection();

        if (!position || !selection) return;

        const cursorData = {
          documentId: id,
          position: {
            lineNumber: position.lineNumber,
            column: position.column,
            selection: {
              startLineNumber: selection.startLineNumber,
              startColumn: selection.startColumn,
              endLineNumber: selection.endLineNumber,
              endColumn: selection.endColumn,
            },
          },
        };

        socketRef.current.emit("cursor-position", cursorData);
      } catch (error) {
        console.error("❌ Cursor update error:", error);
      }
    };

    // Update cursor every 100ms while moving
    let cursorUpdateTimeout = null;
    const updateCursorDebounced = () => {
      if (cursorUpdateTimeout) clearTimeout(cursorUpdateTimeout);
      cursorUpdateTimeout = setTimeout(sendCursorPosition, 100);
    };

    // Listen for remote cursor updates
    socketRef.current.on("cursor-position", (data) => {
      if (data.userId === currentuser?._id) return; // Skip our own cursor

      try {
        const userId = data.userId;
        const username = data.username || "User";
        const color = getRandomColor(userId);
        const position = data.position;

        // Update the cursor for this specific user
        updateUserCursor(userId, username, color, position);
      } catch (err) {
        console.error("Error updating remote cursor:", err);
      }
    });

    // Function to update a specific user's cursor
    const updateUserCursor = (userId, username, color, position) => {
      // Get existing cursor data or create new
      const cursorData = userCursors.get(userId) || { decorations: [] };

      // Create the style for this cursor if needed
      addRemoteCursorStyle(userId, color, username);

      // Create decoration for this user's cursor
      const newDecorations = [
        {
          range: new monaco.Range(
            position.selection.startLineNumber,
            position.selection.startColumn,
            position.selection.endLineNumber,
            position.selection.endColumn
          ),
          options: {
            className: `remote-cursor-${userId}`,
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            hoverMessage: { value: `${username} is here` },
          },
        },
      ];

      // Apply the decorations for just this user
      const appliedDecorations = editor.deltaDecorations(
        cursorData.decorations,
        newDecorations
      );

      // Store the updated decoration IDs for this user
      userCursors.set(userId, {
        decorations: appliedDecorations,
        username,
        color,
        position,
      });
    };

    // Monitor cursor movement
    const cursorDisposable = editor.onDidChangeCursorPosition(
      updateCursorDebounced
    );
    const selectionDisposable = editor.onDidChangeCursorSelection(
      updateCursorDebounced
    );

    // Store for cleanup
    cursorTrackingRef.current = {
      userCursors,
      cursorDisposable,
      selectionDisposable,
      cleanup: () => {
        cursorDisposable.dispose();
        selectionDisposable.dispose();

        if (socketRef.current) {
          socketRef.current.off("cursor-position");
        }

        // Remove the event listener
        document.removeEventListener(
          "restore-remote-cursors",
          cursorRestoreHandler
        );

        // Clean up all cursor decorations
        for (const { decorations } of userCursors.values()) {
          if (decorations.length && editor && !editor.isDisposed()) {
            editor.deltaDecorations(decorations, []);
          }
        }

        if (cursorUpdateTimeout) {
          clearTimeout(cursorUpdateTimeout);
        }
      },
    };

    // Initial cursor update
    setTimeout(sendCursorPosition, 500);
  };

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
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="ml-4 bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
              disabled={!hasWritePermission()}
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
        {/* Sidebar toggle button - Always visible for opening */}
        {!isExplorerOpen && (
          <button
            onClick={() => setIsExplorerOpen(true)}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-slate-800/90 z-20 p-1.5 rounded-md text-slate-400 hover:text-white border border-slate-600 shadow-lg transition-all duration-200"
            title="Show Explorer"
          >
            <FiChevronRight />
          </button>
        )}

        {/* Explorer sidebar */}
        <motion.div
          initial={{ width: isExplorerOpen ? 250 : 0 }}
          animate={{ width: isExplorerOpen ? 250 : 0 }}
          transition={{ duration: 0.2 }}
          className="h-full bg-slate-900/90 border-r border-slate-700/50 overflow-hidden flex-shrink-0"
        >
          {isExplorerOpen && (
            <div className="flex flex-col h-full w-[250px]">
              {/* Sidebar header with close button */}
              <div className="flex-none p-2 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  {currentFolder ? (
                    // Show the folder/all files toggle only when the current document belongs to a folder
                    <button
                      onClick={() => setShowAllFiles(!showAllFiles)}
                      className="text-xs flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800/80 px-2 py-1 rounded"
                    >
                      {showAllFiles ? (
                        <>
                          <FiFolder size={12} className="text-blue-400" /> View
                          All Files
                        </>
                      ) : (
                        <>
                          <FiFolder size={12} className="text-purple-400" />{" "}
                          View Current Project
                        </>
                      )}
                    </button>
                  ) : (
                    // For global files, just show a title
                    <span className="text-xs flex items-center gap-1.5 text-slate-300 bg-slate-800/80 px-2 py-1 rounded">
                      <FiFile size={12} className="text-blue-400" /> Global
                      Files
                    </span>
                  )}

                  {/* Close button */}
                  <button
                    onClick={() => setIsExplorerOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Hide Explorer"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              </div>

              {/* File explorer content */}
              <div className="flex-1 overflow-hidden">
                <FileExplorer
                  onFileSelect={handleFileSelect}
                  currentDocumentId={id}
                  currentFolderId={
                    currentFolder && !showAllFiles ? currentFolder : null
                  }
                  showAllFiles={currentFolder ? showAllFiles : false}
                  className="h-full"
                  filterGlobalOnly={!currentFolder}
                  filesOnly={!currentFolder}
                  showFolderOptions={true}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Main editor content */}
        <div className="flex-1 relative bg-white min-w-0">
          <Editor
            height="100%"
            width="100%"
            defaultLanguage={language}
            language={language}
            theme={theme}
            onMount={handleEditorDidMount}
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
            activeUsers={Array.from(connectedUsers.values())}
            currentuser={currentuser}
            onClose={() => setIsCollaboratorsOpen(false)}
            onInviteClick={handleShareDocument}
            position="full-height" // Add this prop for DocumentEditor
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
