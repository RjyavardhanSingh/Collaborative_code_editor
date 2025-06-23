import { useState, useEffect } from "react";
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
} from "react-icons/fi";
import api from "../../lib/api.js";
import Navbar from "../../components/layout/NavBar";
import FileExplorer from "../../components/explorer/FileExplorer";

export default function SharedDocuments() {
  const { currentuser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSharedDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch only shared documents
        const response = await api.get(
          `/api/users/${currentuser._id}/documents?type=shared`
        );
        setSharedDocuments(response.data.shared || []);
      } catch (error) {
        console.error("Error fetching shared documents:", error);
        setError("Failed to load shared documents. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentuser?._id) {
      fetchSharedDocuments();
    }
  }, [currentuser]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const hours = Math.floor(diffTime / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diffTime / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
      }
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} week${
        Math.floor(diffDays / 7) !== 1 ? "s" : ""
      } ago`;

    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <div
          className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15), rgba(0, 0, 0, 0) 70%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15), rgba(0, 0, 0, 0) 70%)",
            zIndex: 0,
          }}
          aria-hidden="true"
        ></div>

        <div className="flex flex-col items-center z-10">
          <motion.div
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          ></motion.div>
          <motion.p
            className="mt-6 text-slate-300 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Loading shared documents...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Background gradients (same as Dashboard) */}
      <div
        className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15), rgba(0, 0, 0, 0) 70%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15), rgba(0, 0, 0, 0) 70%)",
          zIndex: 0,
        }}
        aria-hidden="true"
      ></div>

      <div
        className="fixed inset-x-0 top-0 transform-gpu overflow-hidden blur-3xl z-0 pointer-events-none opacity-40"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-purple-600 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <Navbar
        title="Shared Documents"
        actions={
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FiSearch className="text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-600 rounded-md bg-slate-700/50 backdrop-blur-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search shared documents..."
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
              Shared Documents
            </h1>
            <p className="mt-2 text-slate-300">
              Documents shared with you by other users
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left column with file explorer - with fixed height */}
            <div className="lg:w-1/3">
              <div
                className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden backdrop-blur-sm"
                style={{ maxHeight: "650px", height: "650px" }}
              >
                <FileExplorer
                  onFileSelect={(file) => navigate(`/documents/${file._id}`)}
                  className="h-full overflow-y-auto"
                  sharedOnly={true}
                />
              </div>
            </div>

            {/* Right column with shared documents list */}
            <div className="lg:w-2/3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden backdrop-blur-sm"
              >
                <div className="px-6 py-5 bg-slate-800/70 border-b border-slate-700/70 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <FiFolder className="text-blue-400" /> All Shared Documents
                  </h3>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {sharedDocuments.length > 0 ? (
                    sharedDocuments.map((doc) => (
                      <motion.div
                        key={doc._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-slate-800 hover:bg-slate-700/30 transition-colors"
                      >
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <Link
                                to={`/documents/${doc._id}`}
                                className="text-blue-500 font-medium hover:text-blue-400 flex items-center gap-2"
                              >
                                <span>{doc.title}</span>
                                {doc.isPublic && (
                                  <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800/50">
                                    <FiGlobe
                                      className="inline mr-1"
                                      size={10}
                                    />{" "}
                                    Public
                                  </span>
                                )}
                              </Link>
                              <div className="flex items-center mt-1 gap-2 flex-wrap">
                                <span className="text-xs font-medium text-slate-400">
                                  {doc.language}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  •
                                </span>
                                <span className="text-xs text-slate-400">
                                  Owner: {doc.owner?.username || "Unknown"}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  •
                                </span>
                                <span className="text-xs text-slate-500 flex items-center">
                                  <FiClock className="mr-1" size={12} />{" "}
                                  {formatDate(doc.updatedAt)}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  •
                                </span>
                                <span className="text-xs text-slate-400 bg-slate-700/70 px-2 py-1 rounded-md">
                                  {doc.collaborators?.find(
                                    (c) => c.user?._id === currentuser?._id
                                  )?.permission || "read"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="py-2 px-4 flex justify-between items-center border-t border-slate-700/50 bg-slate-800/30">
                          <div className="flex items-center gap-3">
                            <motion.button
                              whileHover={{ y: -2 }}
                              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 transition-all px-3 py-1.5 rounded-md"
                              onClick={() => navigate(`/documents/${doc._id}`)}
                            >
                              <FiEdit className="text-blue-400" size={14} />
                              Open
                            </motion.button>
                            <motion.button
                              whileHover={{ y: -2 }}
                              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 transition-all px-3 py-1.5 rounded-md"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/documents/${doc._id}`
                                );
                                // Add toast notification here if available
                              }}
                            >
                              <FiCopy className="text-slate-400" size={14} />
                              Copy Link
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-slate-700/50 rounded-full mx-auto flex items-center justify-center mb-4">
                        <FiUsers className="text-slate-400" size={24} />
                      </div>
                      <p className="text-slate-400">
                        No documents have been shared with you yet.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
