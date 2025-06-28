import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { motion } from "framer-motion";
import {
  FiPlus,
  FiSearch,
  FiStar,
  FiFolder,
  FiUsers,
  FiGrid,
  FiActivity,
  FiEdit,
  FiEye,
  FiCode,
  FiFile,
  FiClock,
  FiGlobe,
  FiCopy,
  FiInfo,
  FiPackage,
  FiFileText,
  FiTag,
} from "react-icons/fi";
import api from "../../lib/api.js";
import Navbar from "../../components/layout/NavBar";

export default function SharedDocuments() {
  const { currentuser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [sharedFolders, setSharedFolders] = useState([]);
  const [activeTab, setActiveTab] = useState("files"); // "files" or "folders"
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSharedContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch shared content with new endpoint that separates files and folders
        const response = await api.get(`/api/users/${currentuser._id}/shared`);

        setSharedFiles(response.data.files || []);
        setSharedFolders(response.data.folders || []);
      } catch (error) {
        console.error("Error fetching shared content:", error);
        setError("Failed to load shared content. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentuser?._id) {
      fetchSharedContent();
    }
  }, [currentuser]);

  // Render methods for different content types
  const renderSharedFileItem = (file) => (
    <motion.div
      key={file._id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-800 hover:bg-slate-700/30 transition-colors border border-slate-700 rounded-lg overflow-hidden"
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <Link
              to={`/documents/${file._id}`}
              className="text-blue-500 font-medium hover:text-blue-400 flex items-center gap-2"
            >
              <span>{file.title}</span>
            </Link>
            <div className="flex items-center gap-2 mt-2">
              {file.sourceType === "folder" && (
                <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800/50 flex items-center gap-1">
                  <FiFolder size={10} /> From Folder:{" "}
                  {file.sourceName || "Unknown"}
                </span>
              )}
              {file.sourceType === "global" && (
                <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800/50 flex items-center gap-1">
                  <FiGlobe size={10} /> Global
                </span>
              )}
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <FiTag size={10} /> {file.language || "text"}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 flex items-center">
            <FiClock className="mr-1" size={12} />
            Shared {new Date(file.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="py-2 px-4 flex justify-between items-center border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ y: -2 }}
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 transition-all px-3 py-1.5 rounded-md"
            onClick={() => navigate(`/documents/${file._id}`)}
          >
            <FiEdit className="text-blue-400" size={14} />
            Open
          </motion.button>
        </div>
        <div>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded">
            {file.permission}
          </span>
        </div>
      </div>
    </motion.div>
  );

  const renderSharedFolderItem = (folder) => (
    <motion.div
      key={folder._id}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:bg-gradient-to-br hover:from-slate-800/80 hover:to-purple-900/30 hover:border-purple-700/40 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/folders/${folder._id}`)}
    >
      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-700/30 flex items-center justify-center text-purple-400 mb-4">
        <FiFolder size={24} />
      </div>
      <h4 className="text-white font-medium">{folder.name}</h4>

      {/* Add this section to indicate partial sharing */}
      {folder.collaborators?.some(
        (c) => c.user._id === currentuser._id && c.selectedFiles?.length > 0
      ) && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full border border-amber-700/40 flex items-center gap-1">
            <FiFileText size={10} /> Partial Access
          </span>
        </div>
      )}

      {folder.documentCount > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
          <FiFileText size={12} />
          <span>
            {folder.collaborators?.find((c) => c.user._id === currentuser._id)
              ?.selectedFiles?.length || folder.documentCount}{" "}
            files
          </span>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center">
        <span className="text-xs text-slate-500">
          Shared by: {folder.owner?.username || "Unknown"}
        </span>
        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">
          {folder.permission}
        </span>
      </div>
    </motion.div>
  );

  // Main render
  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Background gradients */}
      <div
        className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15), rgba(0, 0, 0, 0) 70%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15), rgba(0, 0, 0, 0) 70%)",
          zIndex: 0,
        }}
        aria-hidden="true"
      ></div>

      <Navbar
        title="Shared Content"
        actions={
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FiSearch className="text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-600 rounded-md bg-slate-700/50 backdrop-blur-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search shared content..."
              />
            </div>
          </div>
        }
      >
        <div className="ml-10 hidden md:flex items-baseline space-x-2">
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all duration-300 backdrop-blur-sm"
          >
            <span className="flex items-center gap-2">
              <FiGrid /> Dashboard
            </span>
          </Link>
          <Link
            to="/projects"
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all duration-300 backdrop-blur-sm"
          >
            <span className="flex items-center gap-2">
              <FiFolder /> Projects
            </span>
          </Link>
          <Link
            to="/shared"
            className="px-4 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm text-white"
          >
            <span className="flex items-center gap-2">
              <FiUsers /> Shared
            </span>
          </Link>
        </div>
      </Navbar>

      <main className="py-8 flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4"
            >
              <p className="text-red-400 flex items-center">
                <FiInfo className="mr-2" /> {error}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Shared Content
            </h1>
            <p className="mt-2 text-slate-300">
              Files and projects shared with you
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab("files")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === "files"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <FiFileText /> Shared Files
                {sharedFiles.length > 0 && (
                  <span className="bg-slate-700 text-xs px-2 py-0.5 rounded-full">
                    {sharedFiles.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("folders")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === "folders"
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <FiFolder /> Shared Folders/Projects
                {sharedFolders.length > 0 && (
                  <span className="bg-slate-700 text-xs px-2 py-0.5 rounded-full">
                    {sharedFolders.length}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Content section based on active tab */}
          {activeTab === "files" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-medium text-white mb-4 flex items-center gap-2">
                <FiFileText className="text-blue-400" /> Shared Files
              </h2>

              {sharedFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedFiles.map(renderSharedFileItem)}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full mx-auto flex items-center justify-center mb-4">
                    <FiFileText className="text-slate-400" size={24} />
                  </div>
                  <p className="text-slate-400">
                    No files have been shared with you yet.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "folders" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-medium text-white mb-4 flex items-center gap-2">
                <FiFolder className="text-purple-400" /> Shared Folders &
                Projects
              </h2>

              {sharedFolders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedFolders.map(renderSharedFolderItem)}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full mx-auto flex items-center justify-center mb-4">
                    <FiFolder className="text-slate-400" size={24} />
                  </div>
                  <p className="text-slate-400">
                    No folders or projects have been shared with you yet.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
