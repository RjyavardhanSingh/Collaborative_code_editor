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
} from "react-icons/fi";
import logo from "../../assets/logo.png";

export default function FolderEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentuser } = useAuth();
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);

  // Add these states for document handling
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLanguage, setFileLanguage] = useState("javascript");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef(null);

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
      } catch (err) {
        console.error("Failed to load folder:", err);
        setError("Failed to load project information");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFolder();
    }
  }, [id]);

  // Modified to update URL instead of navigating away
  const handleFileSelect = async (file) => {
    // Update the URL with document ID as a query parameter
    navigate(`/folders/${id}?document=${file._id}`, { replace: true });
    await fetchDocument(file._id);
  };

  const fetchDocument = async (docId) => {
    try {
      setFileLoading(true);
      setFileError(null);
      const { data } = await api.get(`/api/documents/${docId}`);
      setSelectedFile(data);
      setFileContent(data.content || "");

      // Determine language based on file extension
      const fileExtension = data.title.split(".").pop().toLowerCase();
      setFileLanguage(getLanguageFromExtension(fileExtension));
    } catch (err) {
      console.error("Failed to load document:", err);
      setFileError("Failed to load document");
    } finally {
      setFileLoading(false);
    }
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

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
      setLastSaved(Date.now()); // Update last saved time
    } catch (err) {
      console.error("Failed to save document:", err);
      alert("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  // Function to create a new file in this folder
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
        onClick={() => console.log("Share folder", folder?._id)}
        className="p-2 ml-2 rounded text-slate-400 hover:text-white hover:bg-slate-700"
        title="Share Folder"
      >
        <FiUsers />
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
    </>
  );

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
              onClick={() => console.log("Share folder", folder?._id)}
              className="p-2 ml-2 rounded text-slate-400 hover:text-white hover:bg-slate-700"
              title="Share Folder"
            >
              <FiUsers />
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
          </>
        }
      />

      <div className="flex flex-1 relative" id="editor-container">
        {/* Sidebar toggle button */}
        <button
          onClick={() => setIsExplorerOpen(!isExplorerOpen)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-slate-800/80 z-10 p-1.5 rounded-r-md text-slate-400 hover:text-white"
          title={isExplorerOpen ? "Hide Explorer" : "Show Explorer"}
        >
          {isExplorerOpen ? <FiChevronLeft /> : <FiChevronRight />}
        </button>

        {/* Explorer sidebar */}
        <motion.div
          initial={{ width: isExplorerOpen ? 250 : 0 }}
          animate={{ width: isExplorerOpen ? 250 : 0 }}
          transition={{ duration: 0.2 }}
          className="h-full bg-slate-900/90 border-r border-slate-700/50 overflow-hidden"
        >
          {isExplorerOpen && (
            <div className="flex flex-col h-full">
              <div className="flex-none p-2 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium truncate">
                    {folder?.name || "Project"}
                  </h3>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <FileExplorer
                  onFileSelect={handleFileSelect}
                  onFolderSelect={(folder) => {
                    // Navigate to the folder but stay in folder editor view
                    navigate(`/folders/${folder._id}`);
                  }}
                  currentFolderId={id}
                  showAllFiles={true} // Change this from false to true
                  currentDocumentId={selectedFile?._id}
                  className="h-full"
                  showFolderOptions={true}
                  hideHeader={true}
                  excludeGlobalFiles={true}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Main content area */}
        <div className="flex-1 bg-slate-900">
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
                  theme="vs-dark"
                  value={fileContent}
                  onMount={handleEditorDidMount}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: true },
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    lineNumbers: "on",
                    folding: true,
                  }}
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
    </div>
  );
}
