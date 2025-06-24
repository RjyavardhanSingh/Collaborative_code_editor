import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { motion } from "framer-motion";
import api from "../../lib/api.js";
import Navbar from "../../components/layout/NavBar";
import FileExplorer from "../../components/explorer/FileExplorer";
import { FiPlus, FiFile, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import logo from "../../assets/logo.png"; // Adjust path to your logo

export default function FolderEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentuser } = useAuth();
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

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

  const handleFileSelect = (file) => {
    // Navigate to the document editor with this file
    navigate(`/documents/${file._id}`);
  };

  // Function to create a new file in this folder
  const handleCreateFile = () => {
    const filename = prompt("Enter filename with extension (e.g. main.js, index.html)");
    if (!filename) return;

    const extension = filename.split(".").pop().toLowerCase();
    const language = getLanguageFromExtension(extension);
    const content = getDefaultContentForLanguage(language);

    api.post("/api/documents", {
      title: filename,
      content,
      language,
      folder: id,
    })
      .then(response => {
        navigate(`/documents/${response.data._id}`);
      })
      .catch(err => {
        console.error("Error creating file:", err);
        alert("Failed to create file");
      });
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

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar
        title={folder ? folder.name : "Project"}
        actions={
          <button
            onClick={handleCreateFile}
            className="px-4 py-2 rounded-md text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <FiPlus className="text-white" /> New File
          </button>
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
                  currentFolderId={id}
                  showAllFiles={false}
                  className="h-full"
                  showFolderOptions={true}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Main content area */}
        <div className="flex-1 bg-slate-900 flex items-center justify-center">
          {loading ? (
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="text-center p-8">
              <img src={logo} alt="App Logo" className="w-32 h-32 mb-4 mx-auto opacity-30" />
              <h2 className="text-2xl font-bold text-slate-400">Welcome to {folder?.name}</h2>
              <p className="text-slate-500 mt-2 mb-6">Select a file from the explorer or create a new one to begin editing</p>
              <button
                onClick={handleCreateFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors flex items-center gap-2 mx-auto"
              >
                <FiFile className="text-white" /> Create New File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}