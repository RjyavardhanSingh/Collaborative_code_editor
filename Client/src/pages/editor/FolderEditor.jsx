import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react"; // Add this import
import api from "../../lib/api.js";
import Navbar from "../../components/layout/NavBar";
import FileExplorer from "../../components/explorer/FileExplorer";
import {
  FiSave,
  FiPlus,
  FiFile,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiUsers,
  FiDownload,
  FiMaximize,
  FiMinimize,
  FiX,
  FiGitBranch,
} from "react-icons/fi";
import logo from "../../assets/logo.png";
import { FiMessageSquare } from "react-icons/fi";
import CollaboratorManagement from "../../components/collaboration/CollaboratorManagement";
import { io } from "socket.io-client";
import { Connection } from "sharedb/lib/client";
import { MonacoShareDBBinding } from "../../lib/MonacoShareDBBinding";
import GitHubPanel from "../../components/github/GitHubPanel";
import CreateRepositoryModal from "../../components/github/CreateRepositoryModal";
import InitRepositoryModal from "../../components/github/InitRepositoryModal";
import { isGitHubAuthenticated } from "../../lib/githubAuth";

export default function FolderEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentuser } = useAuth();
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const [isGitHubPanelOpen, setIsGitHubPanelOpen] = useState(false);
  const [isCreateRepoModalOpen, setIsCreateRepoModalOpen] = useState(false);
  const [isInitRepoModalOpen, setIsInitRepoModalOpen] = useState(false);
  const [gitHubConnected, setGitHubConnected] = useState(false);

  // Add these missing refs for collaborative editing
  const editorRef = useRef(null); // Add this line
  const bindingRef = useRef(null);
  const shareDBDocRef = useRef(null);
  const shareDBConnectionRef = useRef(null);
  const cursorSocketRef = useRef(null);

  // Add these states for document handling
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLanguage, setFileLanguage] = useState("javascript");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add these state variables to your component
  const [theme, setTheme] = useState(currentuser?.theme || "vs-dark");
  const [lastSaved, setLastSaved] = useState(null);

  // Parse the document ID from the URL query parameter if it exists
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const docId = searchParams.get("document");
    if (docId) {
      fetchDocument(docId);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchFolder = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/folders/${id}`);
        setFolder(data);

        console.log("Folder data:", data);

        // Remove all the collaborator filtering logic
        // Just check if user has access to the folder
        const isOwner = data.owner === currentuser._id;
        const isCollaborator = data.collaborators?.some(
          (c) => c.user === currentuser._id || c.user?._id === currentuser._id
        );

        if (!isOwner && !isCollaborator) {
          setError("You don't have access to this project");
          return;
        }

        setError(null);
      } catch (err) {
        console.error("Failed to load folder:", err);
        setError("Failed to load project information");
      } finally {
        setLoading(false);
      }
    };

    if (id && currentuser) {
      fetchFolder();
    }
  }, [id, currentuser]);

  // Add these refs and states to your FolderEditor component
  const socketRef = useRef(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [activeDocuments, setActiveDocuments] = useState({}); // Track which user is on which document

  // Modified to update URL instead of navigating away
  const handleFileSelect = async (file) => {
    // Update the URL with document ID as a query parameter
    navigate(`/folders/${id}?document=${file._id}`, { replace: true });

    // Emit document activity with title
    if (socketRef.current) {
      socketRef.current.emit("document-activity", {
        folderId: id,
        documentId: file._id,
        documentTitle: file.title, // Make sure this is included
      });
    }

    await fetchDocument(file._id);
  };

  const handleCreateFile = () => {
    const filename = prompt(
      "Enter filename with extension (e.g. main.js, index.html)"
    );
    if (!filename) return;

    const extension = filename.split(".").pop().toLowerCase();
    const language = getLanguageFromExtension(extension);
    const content = getDefaultContentForLanguage(language);

    api
      .post("/api/documents", {
        title: filename,
        content,
        language,
        folder: id,
      })
      .then((response) => {
        // Update the URL to show the new document
        navigate(`/folders/${id}?document=${response.data._id}`, {
          replace: true,
        });
        fetchDocument(response.data._id);
      })
      .catch((err) => {
        console.error("Error creating file:", err);
        alert("Failed to create file");
      });
  };

  // Update your handleSaveDocument function
  const handleSaveDocument = async () => {
    if (!selectedFile || !editorRef.current) return;

    try {
      setIsSaving(true);
      const content = editorRef.current.getValue();

      await api.put(`/api/documents/${selectedFile._id}`, {
        content,
      });

      // Update the local state
      setFileContent(content);
      setLastSaved(Date.now());

      // Auto-sync with Git if folder has Git repo
      if (folder?.githubRepo) {
        try {
          console.log("🔄 Syncing saved file to Git repository");

          // Force sync the file to Git
          const syncResponse = await api.post(
            `/api/github/sync/${folder._id}`,
            {
              files: [{ path: selectedFile.title, content }],
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("githubToken")}`,
              },
            }
          );

          console.log("✅ File synced to Git repository:", syncResponse.data);

          // Refresh Git status after syncing
          if (isGitHubPanelOpen) {
            setTimeout(() => {
              console.log("🔄 Refreshing Git status after file save");
              // This will trigger a refetch through the GitHubPanel component
              setIsGitHubPanelOpen(true);
            }, 500);
          }
        } catch (err) {
          console.error("Git sync error:", err);
        }
      }
    } catch (err) {
      console.error("Failed to save document:", err);
      alert("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchDocument = async (docId) => {
    try {
      setFileLoading(true);
      setFileError(null);

      // Always try folder-specific endpoint first
      try {
        console.log(
          `Fetching document via folder: /api/folders/${id}/documents/${docId}`
        );
        const { data } = await api.get(`/api/folders/${id}/documents/${docId}`);
        setSelectedFile(data);
        setFileContent(data.content || "");

        if (editorRef.current) {
          initializeCollaborativeEditing(editorRef.current, docId);
        }

        const fileExtension = data.title.split(".").pop().toLowerCase();
        const detectedLanguage = getLanguageFromExtension(fileExtension);
        setFileLanguage(detectedLanguage);

        setFileError(null);
      } catch (folderErr) {
        console.error("Failed to fetch via folder endpoint:", folderErr);

        // Only try direct access if we're the document owner
        if (folder.owner === currentuser._id) {
          console.log("Trying direct document access as owner fallback...");
          const { data } = await api.get(`/api/documents/${docId}`);
          setSelectedFile(data);
          setFileContent(data.content || "");

          if (editorRef.current) {
            initializeCollaborativeEditing(editorRef.current, docId);
          }

          const fileExtension = data.title.split(".").pop().toLowerCase();
          const detectedLanguage = getLanguageFromExtension(fileExtension);
          setFileLanguage(detectedLanguage);

          setFileError(null);
        } else {
          throw folderErr; // Re-throw to be caught by outer try/catch
        }
      }
    } catch (err) {
      console.error("Failed to load document:", err);
      const errorMsg =
        err.response?.status === 403
          ? "Permission denied. You don't have access to this file."
          : "Error loading document. Please try again.";

      setFileError(errorMsg);
      setSelectedFile(null);
      setFileContent("");
    } finally {
      setFileLoading(false);
    }
  };

  // Initialize collaborative editing with ShareDB
  const initializeCollaborativeEditing = (editor, docId) => {
    if (!editor || !docId) return;

    console.log(`Setting up collaborative editing for document ${docId}`);

    try {
      // Clean up any existing connections
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

      // Connect to ShareDB server
      const wsUrl = import.meta.env.VITE_SHAREDB_URL || "ws://localhost:8000";
      const roomName = `document-${docId}`;

      console.log(`Connecting to ShareDB: ${wsUrl}/${roomName}`);

      // Create WebSocket connection
      const shareDBSocket = new WebSocket(`${wsUrl}/${roomName}`);

      // Create ShareDB connection
      shareDBConnectionRef.current = new Connection(shareDBSocket);

      // Get the document from ShareDB
      const shareDoc = shareDBConnectionRef.current.get("documents", docId);
      shareDBDocRef.current = shareDoc;

      // Subscribe to the document
      shareDoc.subscribe((err) => {
        if (err) {
          console.error("ShareDB subscription error:", err);
          return;
        }

        console.log("✅ Subscribed to ShareDB document");

        // Create or load the document
        if (!shareDoc.type) {
          // Document doesn't exist, create it with initial content
          const initialContent = fileContent || "";
          shareDoc.create(
            { content: initialContent, language: fileLanguage },
            (err) => {
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
            editor.setValue(shareDoc.data.content);
          } else if (fileContent) {
            // Update the document with our content
            shareDoc.submitOp([{ p: ["content"], oi: fileContent }]);
          }

          createBinding(editor, shareDoc);
        }
      });

      // Also set up cursor tracking
      setupCursorTracking(editor, docId);
    } catch (error) {
      console.error("❌ Failed to initialize collaborative editor:", error);
    }
  };

  // Create a binding function to connect ShareDB with Monaco Editor
  const createBinding = (editor, shareDoc) => {
    try {
      console.log("🔗 Creating Monaco-ShareDB binding...");

      // Create a new binding
      bindingRef.current = new MonacoShareDBBinding(shareDoc, editor);

      console.log("✅ Monaco-ShareDB binding created");

      // Set up auto-save
      initializeAutoSave(shareDoc);
    } catch (err) {
      console.error("❌ Error creating binding:", err);
    }
  };

  // Add an auto-save function
  const initializeAutoSave = (shareDoc) => {
    let saveTimeout = null;
    let lastSavedContent = "";

    const autoSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout);

      saveTimeout = setTimeout(async () => {
        try {
          if (!selectedFile) return;

          const content = shareDoc.data?.content || "";
          if (content === lastSavedContent) return;

          console.log("💾 Auto-saving document...");

          await api.put(`/api/documents/${selectedFile._id}`, { content });
          lastSavedContent = content;
          setLastSaved(new Date());

          console.log("✅ Auto-save completed");
        } catch (error) {
          console.error("❌ Auto-save failed:", error);
        }
      }, 2000);
    };

    // Listen for ShareDB operations
    shareDoc.on("op", (op, source) => {
      autoSave();
    });
  };

  // In your FolderEditor component, add this function to set up cursor tracking
  const setupCursorTracking = (editor, docId) => {
    if (!editor || !selectedFile || !currentuser) return;

    console.log("Setting up cursor tracking for folder document");

    const cursorServerUrl =
      import.meta.env.VITE_CURSOR_URL || "ws://localhost:8081";
    const cursorSocket = new WebSocket(`${cursorServerUrl}/cursors/${docId}`);
    cursorSocketRef.current = cursorSocket;

    // Map to store cursor decorations by user ID
    const userCursors = new Map();

    // Enhanced cursor restoration handler
    const cursorRestoreHandler = (event) => {
      const { cursors, timestamp } = event.detail;

      console.log(
        `🔄 Restoring ${cursors.length} REMOTE cursors only (timestamp: ${timestamp})`
      );

      cursors.forEach((cursorData) => {
        const { userId, range, options } = cursorData;

        // IMPORTANT: Skip if this is somehow our own user ID
        if (userId === currentuser._id) {
          console.warn(`⚠️ Skipping restoration for own user: ${userId}`);
          return;
        }

        // Get stored user info
        const userInfo = userCursors.get(userId);
        if (userInfo) {
          console.log(`🔄 Restoring REMOTE cursor for ${userInfo.username}`);

          // Remove existing decorations first to prevent duplicates
          if (userInfo.decorations && userInfo.decorations.length > 0) {
            editor.deltaDecorations(userInfo.decorations, []);
          }

          // Re-apply the cursor decoration
          const newDecorations = editor.deltaDecorations(
            [], // Always start with empty array to prevent conflicts
            [
              {
                range: range,
                options: {
                  ...options,
                  // Ensure we keep the original styling
                  className: `remote-cursor-${userId}`,
                  beforeContentClassName: `remote-cursor-before-${userId}`,
                  hoverMessage: { value: userInfo.username },
                  zIndex: 1000,
                },
              },
            ]
          );

          // Update stored decorations
          userCursors.set(userId, {
            ...userInfo,
            decorations: newDecorations,
            lastRestored: timestamp,
          });

          console.log(
            `✅ Restored REMOTE cursor for ${userInfo.username} with ${newDecorations.length} decorations`
          );
        } else {
          console.warn(
            `⚠️ No user info found for cursor restoration: ${userId}`
          );
        }
      });
    };

    // Add event listener for cursor restoration
    document.addEventListener("restore-remote-cursors", cursorRestoreHandler);

    cursorSocket.onopen = () => {
      console.log("🔗 Cursor WebSocket connected");
      const connectMessage = {
        type: "connect",
        user: {
          id: currentuser._id,
          username: currentuser.username,
          avatar: currentuser.avatar,
        },
      };
      cursorSocket.send(JSON.stringify(connectMessage));
    };

    cursorSocket.onerror = (error) => {
      console.error("❌ Cursor WebSocket error:", error);
    };

    cursorSocket.onclose = (event) => {
      console.log("🔌 Cursor WebSocket closed:", event.code, event.reason);
    };

    const sendCursorPosition = () => {
      const position = editor.getPosition();
      const selection = editor.getSelection();

      if (
        !position ||
        !selection ||
        !cursorSocket ||
        cursorSocket.readyState !== WebSocket.OPEN
      )
        return;

      const cursorMessage = {
        type: "cursor",
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

      cursorSocket.send(JSON.stringify(cursorMessage));
    };

    let cursorTimeout = null;
    const updateCursorDebounced = () => {
      if (cursorTimeout) clearTimeout(cursorTimeout);
      cursorTimeout = setTimeout(sendCursorPosition, 100);
    };

    const cursorDisposable = editor.onDidChangeCursorPosition(
      updateCursorDebounced
    );
    const selectionDisposable = editor.onDidChangeCursorSelection(
      updateCursorDebounced
    );

    // Enhanced message handler with better cursor management
    cursorSocket.onmessage = (event) => {
      try {
        if (!event.data || typeof event.data !== "string") {
          console.warn("Invalid message format:", event.data);
          return;
        }

        const data = JSON.parse(event.data);

        if (data.type === "cursor" && data.userId !== currentuser._id) {
          const userId = data.userId;
          const username = data.username || "User";
          const color = getRandomColor(userId);
          const position = data.position;

          console.log(
            `👁️ Updating cursor for ${username} at line ${position.lineNumber}`
          );

          // Remove previous cursor decorations for this user
          const existingUserData = userCursors.get(userId);
          let oldDecorations = [];

          if (existingUserData && existingUserData.decorations) {
            oldDecorations = existingUserData.decorations;
          }

          // Create new cursor decoration (replace old ones atomically)
          const decorations = editor.deltaDecorations(
            oldDecorations, // Remove old decorations
            [
              {
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
                options: {
                  className: `remote-cursor-${userId}`,
                  beforeContentClassName: `remote-cursor-before-${userId}`,
                  hoverMessage: { value: username },
                  zIndex: 1000,
                },
              },
            ]
          );

          // Store complete user cursor data
          userCursors.set(userId, {
            decorations,
            username,
            color,
            position,
            lastUpdate: Date.now(),
          });

          // Update CSS for this cursor (only if not already exists)
          const styleId = `cursor-style-${userId}`;
          let styleEl = document.getElementById(styleId);

          if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = styleId;
            document.head.appendChild(styleEl);

            styleEl.textContent = `
              .remote-cursor-before-${userId} {
                position: relative;
              }
              .remote-cursor-before-${userId}::before {
                content: "";
                position: absolute;
                height: 18px;
                width: 2px;
                background-color: ${color};
                z-index: 1000;
              }
              .remote-cursor-before-${userId}::after {
                content: "${username}";
                position: absolute;
                top: -18px;
                left: 0;
                background: ${color};
                color: white;
                padding: 0 4px;
                font-size: 12px;
                border-radius: 2px;
                white-space: nowrap;
                z-index: 1000;
              }
            `;
          }
        }

        // Handle cursor disconnect
        if (data.type === "cursor-disconnect") {
          const userId = data.userId;
          const userData = userCursors.get(userId);

          if (userData && userData.decorations) {
            editor.deltaDecorations(userData.decorations, []);
            userCursors.delete(userId);

            // Remove CSS
            const styleEl = document.getElementById(`cursor-style-${userId}`);
            if (styleEl) {
              styleEl.remove();
            }
          }
        }
      } catch (err) {
        console.error("❌ Cursor tracking error:", err);
        console.error("❌ Raw message that caused error:", event.data);
      }
    };

    // Send initial position
    setTimeout(() => {
      console.log("📍 Sending initial cursor position");
      sendCursorPosition();
    }, 1000);

    // Return cleanup function
    return () => {
      console.log("🧹 Cleaning up cursor tracking");

      // Remove event listener
      document.removeEventListener(
        "restore-remote-cursors",
        cursorRestoreHandler
      );

      cursorDisposable.dispose();
      selectionDisposable.dispose();

      if (cursorTimeout) clearTimeout(cursorTimeout);

      if (cursorSocket && cursorSocket.readyState === WebSocket.OPEN) {
        cursorSocket.close();
      }

      // Clean up all cursor decorations and styles
      userCursors.forEach((userData, userId) => {
        if (userData.decorations) {
          editor.deltaDecorations(userData.decorations, []);
        }
        const styleEl = document.getElementById(`cursor-style-${userId}`);
        if (styleEl) {
          styleEl.remove();
        }
      });

      userCursors.clear();
    };
  };

  // Add this helper function for cursor colors
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

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    // Initialize collaborative editing if a file is selected
    if (selectedFile && selectedFile._id) {
      initializeCollaborativeEditing(editor, selectedFile._id);
    }

    // Set editor options
    editor.updateOptions({
      readOnly: !hasWritePermission(),
      fontSize: 14,
      minimap: { enabled: true },
      automaticLayout: true,
      tabSize: 2,
      wordWrap: "on",
      lineNumbers: "on",
    });
  };

  // Add this function to handle language changes
  const handleLanguageChange = async (newLanguage) => {
    if (!selectedFile) return;

    try {
      setFileLanguage(newLanguage);
      await api.put(`/api/documents/${selectedFile._id}`, {
        language: newLanguage,
      });
    } catch (err) {
      console.error("Failed to update language:", err);
    }
  };

  // Helper functions for file extension and language
  const getLanguageFromExtension = (ext) => {
    const extensionMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      py: "python",
      java: "java",
    };
    return extensionMap[ext] || "plaintext";
  };

  const getDefaultContentForLanguage = (lang) => {
    switch (lang) {
      case "javascript":
        return "// JavaScript code\nconsole.log('Hello, world!');\n";
      case "html":
        return "<!DOCTYPE html>\n<html>\n<head>\n  <title>New Document</title>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n</body>\n</html>";
      case "css":
        return "/* CSS styles */\nbody {\n  font-family: sans-serif;\n}\n";
      default:
        return "";
    }
  };

  // Determine the navbar title based on selected file or folder
  const getNavTitle = () => {
    if (selectedFile) {
      return selectedFile.title;
    } else if (folder) {
      return folder.name;
    } else {
      return "Project";
    }
  };

  // Collaborator and chat state management
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const socketMessageRef = useRef(null);
  const messageContainerRef = useRef(null);

  // Add this effect for socket connection
  useEffect(() => {
    if (!folder) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socketMessageRef.current = io(socketUrl, {
      withCredentials: true,
      query: { folderId: folder._id },
      auth: { token: localStorage.getItem("authToken") },
    });

    socketMessageRef.current.emit("join-folder", { folderId: folder._id });

    socketMessageRef.current.on("new-message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      if (!isChatOpen) {
        setUnreadMessageCount((prev) => prev + 1);
      }
    });

    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/api/folders/${folder._id}/messages`);
        setMessages(data || []);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();

    return () => {
      if (socketMessageRef.current) {
        socketMessageRef.current.disconnect();
      }
    };
  }, [folder?._id, isChatOpen]);

  // Add effect to scroll messages to bottom when new messages arrive
  useEffect(() => {
    if (messageContainerRef.current && isChatOpen) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages, isChatOpen]);

  // Add this effect to fetch collaborators
  useEffect(() => {
    if (!folder?._id) return;

    const fetchCollaborators = async () => {
      try {
        const { data } = await api.get(
          `/api/folders/${folder._id}/collaborators`
        );

        // Format data for CollaboratorManagement component
        const formatted = [
          { user: data.owner, isOwner: true, permission: "admin" },
          ...data.collaborators,
        ];

        setCollaborators(formatted);
      } catch (err) {
        console.error("Failed to fetch collaborators:", err);
      }
    };

    fetchCollaborators();
  }, [folder]);

  // Add these functions for collaboration panel
  const handleShareFolder = () => {
    setIsChatOpen(false);
    setIsCollaboratorsOpen(!isCollaboratorsOpen);
  };

  const handleOpenChat = () => {
    setIsCollaboratorsOpen(false);
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadMessageCount(0);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socketMessageRef.current) return;

    socketMessageRef.current.emit("send-message", {
      content: newMessage,
      folderId: folder._id,
      sender: {
        _id: currentuser._id,
        username: currentuser.username,
      },
    });

    setNewMessage("");
  };

  // Socket effect for real-time collaboration
  useEffect(() => {
    if (!id || !currentuser) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socketRef.current = io(socketUrl, {
      withCredentials: true,
      query: { folderId: id },
      auth: { token: localStorage.getItem("authToken") },
    });

    socketRef.current.emit("join-folder", { folderId: id });

    // Listen for user joined events
    socketRef.current.on("folder-user-joined", ({ user, users }) => {
      console.log("User joined folder:", user.username);
      setActiveUsers(users);
    });

    // Listen for user left events
    socketRef.current.on("folder-user-left", ({ userId, users }) => {
      console.log("User left folder");
      setActiveUsers(users);
    });

    // Listen for document activity
    socketRef.current.on("document-activity", (data) => {
      console.log("📄 Document activity received:", data);

      const { userId, documentId, username, documentTitle } = data;

      setActiveDocuments((prev) => ({
        ...prev,
        [userId]: {
          documentId,
          username,
          documentTitle,
        },
      }));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [id, currentuser]);

  // Determine the navbar actions based on context
  const navbarActions = (
    <>
      {/* Last saved indicator - only show when file is selected */}
      {selectedFile && (
        <div className="text-xs text-slate-400 ml-4">
          {lastSaved
            ? `Last saved ${new Date(lastSaved).toLocaleTimeString()}`
            : ""}
        </div>
      )}

      {/* Theme selector - always available */}
      <select
        value={theme || "vs-dark"}
        onChange={(e) => setTheme(e.target.value)}
        className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 ml-4"
      >
        <option value="vs-dark">Dark</option>
        <option value="light">Light</option>
        <option value="hc-black">High Contrast</option>
      </select>

      {/* Language selector - only visible when file is selected */}
      {selectedFile && (
        <select
          value={fileLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 ml-2"
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="csharp">C#</option>
          <option value="cpp">C++</option>
          <option value="markdown">Markdown</option>
          <option value="json">JSON</option>
        </select>
      )}

      {/* Save button - only visible when file is selected */}
      {selectedFile && (
        <button
          onClick={handleSaveDocument}
          disabled={isSaving}
          className="flex items-center px-3 py-1 ml-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {isSaving ? (
            <FiRefreshCw className="animate-spin mr-1" />
          ) : (
            <FiSave className="mr-1" />
          )}
          {isSaving ? "Saving..." : "Save"}
        </button>
      )}

      {/* Share folder button */}
      <button
        onClick={handleShareFolder}
        className={`p-2 rounded ${
          isCollaboratorsOpen
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white hover:bg-slate-700"
        }`}
        title="Share Project"
      >
        <FiUsers />
        {/* Optional - add a badge for invitation count like in document editor */}
      </button>

      {/* Export folder content */}
      <button
        onClick={() => console.log("Export folder", folder?._id)}
        className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-700"
        title="Export Folder"
      >
        <FiDownload />
      </button>

      {/* Fullscreen toggle */}
      <button
        onClick={() => {
          const container = document.getElementById("editor-container");
          if (!document.fullscreenElement) {
            container.requestFullscreen().catch((err) => {
              console.error(
                `Error attempting to enable fullscreen: ${err.message}`
              );
            });
          } else {
            document.exitFullscreen();
          }
        }}
        className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-700"
        title="Toggle Fullscreen"
      >
        <FiMaximize />
      </button>

      {/* New file button - already in your component */}
      <button
        onClick={handleCreateFile}
        className="px-4 py-1.5 ml-2 rounded-md text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2"
      >
        <FiPlus /> New File
      </button>

      {/* Chat button - always visible */}
      <button
        onClick={handleOpenChat}
        className={`p-2 rounded relative ${
          isChatOpen
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white hover:bg-slate-700"
        }`}
        title="Project Chat"
      >
        <FiMessageSquare />
        {unreadMessageCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadMessageCount}
          </span>
        )}
      </button>

      {/* GitHub panel toggle */}
      <button
        onClick={() => setIsGitHubPanelOpen(!isGitHubPanelOpen)}
        className={`p-2 rounded ${
          isGitHubPanelOpen
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white hover:bg-slate-700"
        }`}
        title="Git Version Control"
      >
        <FiGitBranch />
      </button>
    </>
  );

  const hasWritePermission = () => {
    if (!folder || !currentuser) return false;

    // Check if user is owner
    if (folder.owner === currentuser._id) return true;

    // Check if user is a collaborator with write permission
    const collaborator = folder.collaborators?.find(
      (c) => c.user === currentuser._id || c.user?._id === currentuser._id
    );

    return (
      collaborator?.permission === "write" ||
      collaborator?.permission === "admin"
    );
  };

  // Add an effect to check GitHub connection status
  useEffect(() => {
    setGitHubConnected(isGitHubAuthenticated());
  }, []);

  // Add this function to handle repository creation success
  const handleRepoCreationSuccess = (repoData) => {
    setIsCreateRepoModalOpen(false);
    setGitHubConnected(true);
    // Refresh folder data to get updated GitHub repo info
    const fetchFolderData = async () => {
      try {
        const { data } = await api.get(`/api/folders/${id}`);
        setFolder(data);
      } catch (err) {
        console.error("Failed to refresh folder data:", err);
      }
    };
    fetchFolderData();
  };

  // Add this for handling initialization success
  const handleRepoInitSuccess = (data) => {
    setIsInitRepoModalOpen(false);

    if (data.repository) {
      setFolder((prev) => ({
        ...prev,
        githubRepo: {
          ...prev.githubRepo,
          isInitialized: true,
        },
      }));
    }

    // Refresh folder data to get updated GitHub repo info
    fetchFolderData();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar
        showBackButton={true}
        title={getNavTitle()}
        actions={
          <>
            {/* Last saved indicator - only show when file is selected */}
            {selectedFile && (
              <div className="text-xs text-slate-400 ml-4">
                {lastSaved
                  ? `Last saved ${new Date(lastSaved).toLocaleTimeString()}`
                  : ""}
              </div>
            )}

            {/* Theme selector - always available */}
            <select
              value={theme || "vs-dark"}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 ml-4"
            >
              <option value="vs-dark">Dark</option>
              <option value="light">Light</option>
              <option value="hc-black">High Contrast</option>
            </select>

            {/* Language selector - only visible when file is selected */}
            {selectedFile && (
              <select
                value={fileLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 ml-2"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="csharp">C#</option>
                <option value="cpp">C++</option>
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
              </select>
            )}

            {/* Save button - only visible when file is selected */}
            {selectedFile && (
              <button
                onClick={handleSaveDocument}
                disabled={isSaving}
                className="flex items-center px-3 py-1 ml-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                {isSaving ? (
                  <FiRefreshCw className="animate-spin mr-1" />
                ) : (
                  <FiSave className="mr-1" />
                )}
                {isSaving ? "Saving..." : "Save"}
              </button>
            )}

            {/* Share folder button */}
            <button
              onClick={handleShareFolder}
              className={`p-2 rounded ${
                isCollaboratorsOpen
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title="Share Project"
            >
              <FiUsers />
              {/* Optional - add a badge for invitation count like in document editor */}
            </button>

            {/* Export folder content */}
            <button
              onClick={() => console.log("Export folder", folder?._id)}
              className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-700"
              title="Export Folder"
            >
              <FiDownload />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={() => {
                const container = document.getElementById("editor-container");
                if (!document.fullscreenElement) {
                  container.requestFullscreen().catch((err) => {
                    console.error(
                      `Error attempting to enable fullscreen: ${err.message}`
                    );
                  });
                } else {
                  document.exitFullscreen();
                }
              }}
              className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-700"
              title="Toggle Fullscreen"
            >
              <FiMaximize />
            </button>

            {/* New file button - already in your component */}
            <button
              onClick={handleCreateFile}
              className="px-4 py-1.5 ml-2 rounded-md text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2"
            >
              <FiPlus /> New File
            </button>

            {/* Chat button - always visible */}
            <button
              onClick={handleOpenChat}
              className={`p-2 rounded relative ${
                isChatOpen
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title="Project Chat"
            >
              <FiMessageSquare />
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadMessageCount}
                </span>
              )}
            </button>

            {/* GitHub panel toggle */}
            <button
              onClick={() => setIsGitHubPanelOpen(!isGitHubPanelOpen)}
              className={`p-2 rounded ${
                isGitHubPanelOpen
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title="Git Version Control"
            >
              <FiGitBranch />
            </button>
          </>
        }
      />

      <div className="flex flex-1 relative" id="editor-container">
        {/* Sidebar toggle button - Only show when sidebar is closed */}
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
                  <h3 className="text-white font-medium truncate">
                    {folder?.name || "Project"}
                  </h3>

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
                  onFolderSelect={(folder) => {
                    navigate(`/folders/${folder._id}`);
                  }}
                  className="h-full overflow-y-auto"
                  currentFolderId={id}
                  selectedFileId={selectedFile?._id}
                  showNestedFiles={true}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Main content area */}
        <div className="flex-1 bg-slate-900 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400">{error}</div>
            </div>
          ) : selectedFile ? (
            // Show editor when a file is selected
            <div className="h-full flex flex-col">
              {fileLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : fileError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-red-400">{fileError}</div>
                </div>
              ) : (
                <Editor
                  height="100%"
                  defaultLanguage={fileLanguage}
                  language={fileLanguage}
                  value={fileContent}
                  theme={theme}
                  options={{ readOnly: !hasWritePermission() }}
                  onMount={handleEditorDidMount}
                  onChange={(value) => setFileContent(value)}
                />
              )}
            </div>
          ) : (
            // Show welcome screen when no file is selected
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <img
                  src={logo}
                  alt="App Logo"
                  className="w-32 h-32 mb-4 mx-auto opacity-30"
                />
                <h2 className="text-2xl font-bold text-slate-400">
                  Welcome to {folder?.name}
                </h2>
                <p className="text-slate-500 mt-2 mb-6">
                  Select a file from the explorer or create a new one to begin
                  editing
                </p>
                <button
                  onClick={handleCreateFile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors flex items-center gap-2 mx-auto"
                >
                  <FiFile className="text-white" /> Create New File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collaborator management modal */}
      {isCollaboratorsOpen && (
        <CollaboratorManagement
          documentId={folder._id}
          collaborators={collaborators}
          setCollaborators={setCollaborators}
          activeUsers={activeUsers}
          currentuser={currentuser}
          onClose={() => setIsCollaboratorsOpen(false)}
          onInviteClick={() => {
            setIsCollaboratorsOpen(false);
            // Open invitation modal or use FolderSharingDialog here
          }}
          isFolder={true}
          activeDocuments={activeDocuments} // Add this new prop
        />
      )}

      {/* Chat interface - conditionally render based on isChatOpen state */}
      {isChatOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="absolute top-0 right-0 h-full w-[300px] border-l border-slate-700 bg-slate-800 flex flex-col shadow-xl z-10"
        >
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-white font-medium">Project Chat</h2>
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
            {messages.length === 0 ? (
              <p className="text-slate-400 text-center text-sm">
                No messages yet. Start a conversation!
              </p>
            ) : (
              messages.map((message, idx) => (
                <div
                  key={idx}
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
                        : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {message.sender._id !== currentuser?._id && (
                      <p className="text-xs font-bold mb-1">
                        {message.sender.username}
                      </p>
                    )}
                    <p>{message.content}</p>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-700">
            <div className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-700 text-white rounded-l px-3 py-2 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
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

      {/* GitHub panel - add this at the end of your return */}
      {isGitHubPanelOpen && (
        <GitHubPanel
          folderId={folder?._id}
          onClose={() => setIsGitHubPanelOpen(false)}
          refreshFiles={() => {
            // Add logic to refresh files after Git operations
            if (selectedFile) {
              fetchDocument(selectedFile._id);
            }
          }}
          currentFiles={[selectedFile].filter(Boolean)}
        />
      )}

      {/* Create repository modal - add this at the end of your return */}
      {isCreateRepoModalOpen && (
        <CreateRepositoryModal
          folderId={folder?._id}
          folderName={folder?.name}
          onClose={() => setIsCreateRepoModalOpen(false)}
          onSuccess={handleRepoCreationSuccess}
        />
      )}

      {/* Repository initialization modal */}
      {isInitRepoModalOpen && (
        <InitRepositoryModal
          folderId={folder?._id}
          repositoryName={folder?.githubRepo?.name || folder?.name}
          onClose={() => setIsInitRepoModalOpen(false)}
          onSuccess={handleRepoInitSuccess}
        />
      )}
    </div>
  );
}
