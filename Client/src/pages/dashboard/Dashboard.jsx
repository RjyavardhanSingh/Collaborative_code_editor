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
  FiLock,
  FiCodepen,
  FiCommand,
  FiCopy,
  FiInfo,
  FiCalendar,
  FiTrendingUp,
  FiZap,
  FiArrowRight,
  FiFolderPlus,
  FiX,
} from "react-icons/fi";
import api from "../../lib/api.js";
import Navbar from "../../components/layout/NavBar";
import FileExplorer from "../../components/explorer/FileExplorer";

export default function Dashboard() {
  const { currentuser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    ownedDocuments: [],
    sharedDocuments: [],
    pinnedDocuments: [],
    activityStats: null,
  });
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const documentResponse = await api.get(
          `/api/users/${currentuser._id}/documents`
        );
        const analyticsResponse = await api.get("/api/analytics/usage");
        const pinnedDocs = documentResponse.data.owned.slice(0, 2);

        setDashboardData({
          ownedDocuments: documentResponse.data.owned,
          sharedDocuments: documentResponse.data.shared,
          pinnedDocuments: pinnedDocs,
          activityStats: analyticsResponse.data,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentuser?._id) {
      fetchDashboardData();
    }
  }, [currentuser]);

  // Update handleCreateDocument to support folder selection
  const handleCreateDocument = async (templateId, folderId = null) => {
    try {
      let language = "javascript";
      let content = "// New document\n";
      let title = "Untitled Document";

      const filename = prompt(
        "Enter filename with extension (e.g. main.js, index.html):",
        templateId ? getDefaultFilename(templateId) : "untitled.js"
      );

      if (!filename) return;

      const extension = filename.split(".").pop().toLowerCase();
      title = filename;

      language = getLanguageFromExtension(extension);

      if (templateId) {
        const template = getTemplateContent(templateId);
        content = template.content || content;
      } else {
        content = getDefaultContentForLanguage(language);
      }

      setIsLoading(true); // FIXED: Changed setLoading to setIsLoading
      const response = await api.post("/api/documents", {
        title,
        content,
        language,
        folder: folderId, // Add folder ID if provided
      });

      navigate(`/documents/${response.data._id}`);
    } catch (error) {
      console.error("Error creating document:", error);
      setError(
        "Failed to create document. Network error or server is unreachable."
      );
    } finally {
      setIsLoading(false); // FIXED: Changed setLoading to setIsLoading
      setShowNewDocumentModal(false);
    }
  };

  const handleFolderSelect = (folder) => {
    navigate(`/folders/${folder._id}`);
  };

  const handleCreateProject = async () => {
    try {
      // Validate project name from the dialog input instead of showing a prompt
      if (!projectName.trim()) {
        setError("Project name cannot be empty");
        return;
      }

      // For debugging - helps identify what's being sent to server
      console.log("Creating project with name:", projectName);

      const response = await api.post("/api/folders", {
        name: projectName,
        parentFolder: null, // Root level folder
      });

      // Reset project name and close modal
      setProjectName("");
      setShowNewProjectModal(false);

      // Refresh dashboard data to show the new folder
      fetchDashboardData();
    } catch (error) {
      console.error("Error creating project:", error);
      // More detailed error handling
      if (error.response) {
        console.error("Server response:", error.response.data);
        setError(
          `Failed to create project: ${
            error.response.data.message || "Server error"
          }`
        );
      } else {
        setError("Failed to create project. Please try again.");
      }
    }
  };

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

  const templates = [
    {
      id: "js",
      name: "JavaScript",
      description: "Basic JavaScript setup with ES6 syntax",
      icon: <FiCode />,
    },
    {
      id: "react",
      name: "React Component",
      description: "Functional React component with hooks",
      icon: <FiCode />,
    },
    {
      id: "html",
      name: "HTML5",
      description: "HTML5 document with CSS and JS links",
      icon: <FiFile />,
    },
    {
      id: "api",
      name: "API Spec",
      description: "API documentation template",
      icon: <FiGrid />,
    },
  ];

  const documentListItem = (doc, isPinned = false) => (
    <motion.div
      key={doc._id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group hover:bg-slate-700/30 transition-colors"
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="mt-1">{getLanguageIcon(doc.language)}</div>
            <div>
              <Link
                to={`/documents/${doc._id}`}
                className="text-blue-400 font-medium hover:text-blue-300 flex items-center gap-2 transition-colors"
              >
                <span>{doc.title}</span>
                {doc.isPublic && (
                  <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800/50">
                    <FiGlobe className="inline mr-1" size={10} /> Public
                  </span>
                )}
              </Link>
              <div className="flex items-center mt-1 gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {formatLanguage(doc.language)}
                </span>
                <span className="text-[10px] text-slate-500">•</span>
                <span className="text-xs text-slate-500 flex items-center">
                  <FiClock className="mr-1" size={12} />{" "}
                  {formatDate(doc.updatedAt)}
                </span>
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{
              rotate: isPinned ? -15 : 15,
              transition: { duration: 0.2 },
            }}
            className={`text-slate-400 hover:text-${
              isPinned ? "yellow" : "slate"
            }-300`}
            onClick={() =>
              console.log(`${isPinned ? "Unpin" : "Pin"} document ${doc._id}`)
            }
          >
            <FiStar
              className={isPinned ? "fill-yellow-400 text-yellow-400" : ""}
            />
          </motion.button>
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
            Edit
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 transition-all px-3 py-1.5 rounded-md"
            onClick={() => navigate(`/documents/${doc._id}/preview`)}
          >
            <FiEye className="text-purple-400" size={14} />
            Preview
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 transition-all px-3 py-1.5 rounded-md"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/documents/${doc._id}`
              );
              // Show toast notification or feedback
            }}
          >
            <FiCopy className="text-slate-400" size={14} />
            Copy Link
          </motion.button>
        </div>
        <motion.button
          whileHover={{ rotate: 15 }}
          className="text-xs font-medium text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 p-2 rounded-md transition-all"
          onClick={() => console.log(`Share document ${doc._id}`)}
        >
          <FiUsers size={14} />
        </motion.button>
      </div>
    </motion.div>
  );

  const sharedDocumentListItem = (doc) => (
    <motion.div
      key={doc._id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <Link
              to={`/documents/${doc._id}`}
              className="text-blue-500 font-medium hover:text-blue-400"
            >
              {doc.title}
            </Link>
            <div className="flex items-center mt-1 gap-2">
              <span className="text-xs font-medium text-slate-400">
                {doc.language}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-xs text-slate-400">
                Owner: {doc.owner?.username || "Unknown"}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-xs text-slate-500">
                Updated {formatDate(doc.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/50 py-2 px-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <button
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1"
            onClick={() => navigate(`/documents/${doc._id}`)}
          >
            <FiEdit className="text-slate-500" />
            Open
          </button>
        </div>
      </div>
    </motion.div>
  );
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Background gradient effects - matching landing page */}
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
            Loading your workspace...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Background gradient effects - matching landing page */}
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

      <div
        className="fixed inset-x-0 bottom-0 transform-gpu overflow-hidden blur-3xl z-0 pointer-events-none opacity-40"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-purple-800 to-blue-700 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <Navbar
        title="Dashboard"
        actions={
          <>
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <FiSearch className="text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-600 rounded-md bg-slate-700/50 backdrop-blur-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Search documents..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewDocumentModal(true)}
                className="px-4 py-2 rounded-md text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-blue-900/20"
              >
                <FiPlus className="text-white" /> New Document
              </button>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-4 py-2 rounded-md text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-900/20"
              >
                <FiFolder className="text-white" /> New Project
              </button>
            </div>
          </>
        }
      >
        <div className="ml-10 hidden md:flex items-baseline space-x-2">
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm text-white"
          >
            <span className="flex items-center gap-2">
              <FiGrid /> Dashboard
            </span>
          </Link>
          <Link
            to="/shared"
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all duration-300 backdrop-blur-sm"
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
            className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl shadow-2xl overflow-hidden mb-8 border border-blue-900/20 backdrop-blur-sm"
          >
            <div className="px-6 py-8 sm:p-10 sm:pb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Welcome back, {currentuser?.username}!
                  </h2>
                  <p className="mt-2 text-slate-300">
                    Pick up where you left off or start a new project
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex px-4 py-1 text-xs font-medium leading-5 rounded-full bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-blue-300 border border-blue-700/30">
                    <FiZap className="mr-1" /> Pro User
                  </span>
                  <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50">
                    <FiCalendar className="mr-1" /> Member since{" "}
                    {new Date(
                      currentuser?.createdAt || Date.now()
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-800/40 border-t border-slate-700/50 sm:px-10">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-6">
                  {dashboardData.activityStats && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-900/50 flex items-center justify-center text-blue-400">
                          <FiCodepen size={20} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">
                            Documents created
                          </p>
                          <p className="text-xl font-semibold text-white">
                            {dashboardData.activityStats.documentsCreated || 0}
                          </p>
                        </div>
                      </div>
                      <div className="border-l border-slate-700 pl-6 flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center text-purple-400">
                          <FiActivity size={20} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">
                            Recent activity
                          </p>
                          <p className="text-xl font-semibold text-white">
                            {dashboardData.activityStats.recentActivity || 0}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <Link
                  to="/analytics"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 shadow-lg shadow-blue-900/20 flex items-center gap-2"
                >
                  <FiTrendingUp /> View activity log
                </Link>
              </div>
            </div>
          </motion.div>

          <div className="space-y-8">
            {/* Projects Section */}
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-full">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden backdrop-blur-sm"
                >
                  <div className="px-6 py-5 bg-slate-800/70 border-b border-slate-700/70 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <FiFolder className="text-purple-400" /> Your Projects
                    </h3>
                    <button
                      onClick={() => setShowNewProjectModal(true)}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                    >
                      <FiFolderPlus size={14} /> New Project
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {dashboardData.folders &&
                    dashboardData.folders.length > 0 ? (
                      dashboardData.folders
                        .filter((folder) => !folder.parentFolder) // Show only root folders
                        .map((folder) => (
                          <motion.div
                            key={folder._id}
                            whileHover={{
                              y: -5,
                              transition: { duration: 0.2 },
                            }}
                            className="group bg-slate-800 border border-slate-700 rounded-lg p-5 hover:bg-gradient-to-br hover:from-slate-800/80 hover:to-purple-900/30 hover:border-purple-700/40 transition-all duration-300 cursor-pointer"
                            onClick={() => navigate(`/folders/${folder._id}`)}
                          >
                            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-700/30 flex items-center justify-center text-purple-400 mb-4 group-hover:from-purple-600/40 group-hover:to-blue-600/40 transition-all duration-300">
                              <FiFolder size={24} />
                            </div>
                            <h4 className="text-white font-medium">
                              {folder.name}
                            </h4>
                            <p className="text-sm text-slate-400 mt-1">
                              {folder.documents?.length || 0} files
                            </p>
                            <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                              <span className="text-xs text-slate-500">
                                Updated{" "}
                                {new Date(
                                  folder.updatedAt
                                ).toLocaleDateString()}
                              </span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenFolderSharing(folder._id);
                                  }}
                                  className="p-1.5 rounded-md bg-slate-700/50 text-slate-400 hover:text-purple-400 hover:bg-slate-700"
                                >
                                  <FiUsers size={14} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))
                    ) : (
                      <div className="col-span-3 p-8 text-center">
                        <div className="w-16 h-16 bg-slate-700/50 rounded-full mx-auto flex items-center justify-center mb-4">
                          <FiFolder className="text-slate-400" size={24} />
                        </div>
                        <p className="text-slate-400">
                          You don't have any projects yet.
                        </p>
                        <button
                          onClick={() => setShowNewProjectModal(true)}
                          className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md text-sm font-medium transition-all duration-300"
                        >
                          Create your first project
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* First row: Files Explorer and Recent Documents */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left column - Files Explorer */}
              <div className="lg:w-1/3">
                <div
                  className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden backdrop-blur-sm"
                  style={{ height: "280px" }}
                >
                  <div className="px-4 py-3 bg-slate-800/70 border-b border-slate-700/70">
                    <h3 className="text-md font-medium text-white flex items-center gap-1.5">
                      <FiFile className="text-blue-400" size={16} /> Files
                      Explorer
                    </h3>
                  </div>
                  <FileExplorer
                    onFileSelect={(file) => navigate(`/documents/${file._id}`)}
                    className="h-[calc(100%-46px)] overflow-y-auto"
                    filesOnly={true}
                  />
                </div>
              </div>

              {/* Right column - Recent Documents */}
              <div className="lg:w-2/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden backdrop-blur-sm"
                >
                  <div className="px-6 py-5 bg-slate-800/70 border-b border-slate-700/70 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <FiFolder className="text-blue-400" /> Your Recent
                      Documents
                    </h3>
                    <Link
                      to="/documents"
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      View all <FiArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {dashboardData.ownedDocuments.length > 0 ? (
                      dashboardData.ownedDocuments
                        .slice(0, 3)
                        .map((doc) => documentListItem(doc))
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-slate-700/50 rounded-full mx-auto flex items-center justify-center mb-4">
                          <FiFile className="text-slate-400" size={24} />
                        </div>
                        <p className="text-slate-400">
                          You don't have any documents yet.
                        </p>
                        <button
                          onClick={() => setShowNewDocumentModal(true)}
                          className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-md text-sm font-medium transition-all duration-300"
                        >
                          Create your first document
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Second row: Folders Explorer and Quick Templates - truly parallel */}
            <div className="flex flex-col lg:flex-row gap-8 mt-4">
              {/* Left column - Folders Explorer */}
              <div className="lg:w-1/3">
                <div
                  className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden backdrop-blur-sm"
                  style={{ height: "280px" }}
                >
                  <div className="px-4 py-3 bg-slate-800/70 border-b border-slate-700/70">
                    <h3 className="text-md font-medium text-white flex items-center gap-1.5">
                      <FiFolder className="text-purple-400" size={16} /> Folders
                      Explorer
                    </h3>
                  </div>
                  <FileExplorer
                    onFileSelect={(file) => navigate(`/documents/${file._id}`)}
                    onFolderSelect={handleFolderSelect}
                    className="h-[calc(100%-46px)] overflow-y-auto"
                    foldersOnly={true}
                    showFolderOptions={true}
                  />
                </div>
              </div>

              {/* Right column - Quick Templates */}
              <div className="lg:w-2/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl shadow-xl overflow-hidden border border-blue-900/20 backdrop-blur-sm h-full"
                >
                  <div className="px-6 py-5 border-b border-blue-900/30 flex items-center gap-2">
                    <FiCommand className="text-blue-400" size={20} />
                    <h3 className="text-lg font-medium text-white">
                      Quick Start Templates
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((template) => (
                        <motion.div
                          key={template.id}
                          whileHover={{ y: -5, transition: { duration: 0.2 } }}
                          className="group bg-slate-800/70 border border-slate-700/70 rounded-lg p-5 hover:bg-gradient-to-br hover:from-blue-900/40 hover:to-purple-900/40 hover:border-blue-700/50 transition-all duration-300 cursor-pointer"
                          onClick={() => handleCreateDocument(template.id)}
                        >
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-blue-700/30 flex items-center justify-center text-blue-400 mb-4 group-hover:from-blue-600/50 group-hover:to-purple-600/50 transition-all duration-300">
                            {template.icon}
                          </div>
                          <h4 className="text-white font-medium">
                            {template.name}
                          </h4>
                          <p className="text-sm text-slate-400 mt-1">
                            {template.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* New Document Modal */}
      {showNewDocumentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FiFile className="text-blue-400" /> Create New Document
              </h3>
              <button
                onClick={() => setShowNewDocumentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleCreateDocument()}
                className="flex flex-col items-center p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors"
              >
                <FiFile className="text-blue-400 mb-2" size={24} />
                <span className="text-white text-sm">Blank Document</span>
              </button>
              <button
                onClick={() => handleCreateDocument("js")}
                className="flex flex-col items-center p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors"
              >
                <FiCode className="text-blue-400 mb-2" size={24} />
                <span className="text-white text-sm">JavaScript</span>
              </button>
              <button
                onClick={() => handleCreateDocument("react")}
                className="flex flex-col items-center p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors"
              >
                <FiCodepen className="text-blue-400 mb-2" size={24} />
                <span className="text-white text-sm">React Component</span>
              </button>
              <button
                onClick={() => handleCreateDocument("html")}
                className="flex flex-col items-center p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors"
              >
                <FiGlobe className="text-blue-400 mb-2" size={24} />
                <span className="text-white text-sm">HTML Document</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowNewDocumentModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FiFolderPlus className="text-purple-400" /> Create New Project
              </h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <FiX />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Project Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="My Awesome Project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <FiInfo className="text-purple-400" /> Project Structure
                </h4>
                <p className="text-sm text-slate-400 mt-2">
                  Projects help you organize your files in folders. You can
                  create multiple files within a project and nest folders for
                  better organization.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-colors"
              >
                Create Project
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const documentListItem = (doc, isPinned = false) => (
  <motion.div
    key={doc._id}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="group hover:bg-slate-700/30 transition-colors"
  >
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <div className="mt-1">{getLanguageIcon(doc.language)}</div>
          <div>
            <Link
              to={`/documents/${doc._id}`}
              className="text-blue-400 font-medium hover:text-blue-300 flex items-center gap-2 transition-colors"
            >
              <span>{doc.title}</span>
              {doc.isPublic && (
                <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800/50">
                  <FiGlobe className="inline mr-1" size={10} /> Public
                </span>
              )}
            </Link>
            <div className="flex items-center mt-1 gap-2">
              <span className="text-xs font-medium text-slate-400">
                {formatLanguage(doc.language)}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-xs text-slate-500 flex items-center">
                <FiClock className="mr-1" size={12} />{" "}
                {formatDate(doc.updatedAt)}
              </span>
            </div>
          </div>
        </div>
        <motion.button
          whileHover={{
            rotate: isPinned ? -15 : 15,
            transition: { duration: 0.2 },
          }}
          className={`text-slate-400 hover:text-${
            isPinned ? "yellow" : "slate"
          }-300`}
          onClick={() =>
            console.log(`${isPinned ? "Unpin" : "Pin"} document ${doc._id}`)
          }
        >
          <FiStar
            className={isPinned ? "fill-yellow-400 text-yellow-400" : ""}
          />
        </motion.button>
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
          Edit
        </motion.button>
        <motion.button
          whileHover={{ y: -2 }}
          className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 transition-all px-3 py-1.5 rounded-md"
          onClick={() => navigate(`/documents/${doc._id}/preview`)}
        >
          <FiEye className="text-purple-400" size={14} />
          Preview
        </motion.button>
        <motion.button
          whileHover={{ y: -2 }}
          className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 transition-all px-3 py-1.5 rounded-md"
          onClick={() => {
            navigator.clipboard.writeText(
              `${window.location.origin}/documents/${doc._id}`
            );
            // Show toast notification or feedback
          }}
        >
          <FiCopy className="text-slate-400" size={14} />
          Copy Link
        </motion.button>
      </div>
      <motion.button
        whileHover={{ rotate: 15 }}
        className="text-xs font-medium text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 p-2 rounded-md transition-all"
        onClick={() => console.log(`Share document ${doc._id}`)}
      >
        <FiUsers size={14} />
      </motion.button>
    </div>
  </motion.div>
);

// Add these new functions

const formatLanguage = (lang) => {
  // Capitalize first letter
  return lang.charAt(0).toUpperCase() + lang.slice(1);
};

const getLanguageIcon = (language) => {
  const iconSize = 16;

  switch (language.toLowerCase()) {
    case "javascript":
      return (
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-yellow-400/20 border border-yellow-500/30 text-yellow-400">
          JS
        </div>
      );
    case "typescript":
      return (
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-blue-400/20 border border-blue-500/30 text-blue-400">
          TS
        </div>
      );
    case "html":
      return (
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-orange-400/20 border border-orange-500/30 text-orange-400">
          <FiCode size={iconSize} />
        </div>
      );
    case "css":
      return (
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-indigo-400/20 border border-indigo-500/30 text-indigo-400">
          <FiCode size={iconSize} />
        </div>
      );
    case "python":
      return (
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-green-400/20 border border-green-500/30 text-green-400">
          PY
        </div>
      );
    case "markdown":
      return (
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-purple-400/20 border border-purple-500/30 text-purple-400">
          MD
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-slate-700 border border-slate-600 text-slate-400">
          <FiFile size={iconSize} />
        </div>
      );
  }
};

// Map file extensions to language names
const getLanguageFromExtension = (extension) => {
  const extensionMap = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    css: "css",
    py: "python",
    md: "markdown",
    json: "json",
    // Add more mappings as needed
  };

  return extensionMap[extension] || "plaintext";
};

// Get default filename for templates
const getDefaultFilename = (templateId) => {
  switch (templateId) {
    case "js":
      return "script.js";
    case "react":
      return "component.jsx";
    case "html":
      return "index.html";
    case "api":
      return "api-spec.md";
    default:
      return "untitled.js";
  }
};

// Get template content based on template ID
const getTemplateContent = (templateId) => {
  switch (templateId) {
    case "js":
      return {
        content: `// JavaScript Template
'use strict';

/**
 * Example function
 */
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
`,
      };
    case "react":
      return {
        content: `// React Component Template
import React, { useState, useEffect } from 'react';

const Component = ({ title }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data or perform side effects
    console.log('Component mounted');
    return () => console.log('Component unmounted');
  }, []);

  return (
    <div className="component">
      <h2>{title}</h2>
      {/* Component content */}
    </div>
  );
};

export default Component;
`,
      };
    case "html":
      return {
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    /* Add your CSS here */
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h1>Hello World</h1>

  <script>
    // Add your JavaScript here
    console.log('Page loaded');
  </script>
</body>
</html>
`,
      };
    case "api":
      return {
        content: `# API Documentation

## Endpoints

### GET /api/resources
Returns a list of resources.

#### Parameters
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10)

#### Response
\`\`\`json
{
  "data": [
    {
      "id": 1,
      "name": "Example"
    }
  ],
  "pagination": {
    "total": 100,
    "pages": 10,
    "current": 1
  }
}
\`\`\`
`,
      };
    default:
      return { content: "" };
  }
};

// Get default content for a language
const getDefaultContentForLanguage = (language) => {
  switch (language.toLowerCase()) {
    case "javascript":
      return "// New JavaScript document\n\nconsole.log('Hello, world!');\n";
    case "typescript":
      return "// New TypeScript document\n\ninterface User {\n  name: string;\n  id: number;\n}\n\nconst user: User = {\n  name: 'John',\n  id: 1\n};\n\nconsole.log(user);\n";
    case "html":
      return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>';
    case "css":
      return "/* New CSS document */\n\nbody {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 0;\n  line-height: 1.6;\n}\n";
    case "python":
      return '# New Python document\n\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n';
    case "markdown":
      return "# New Document\n\n## Introduction\n\nThis is a new markdown document.\n\n## Features\n\n- Feature 1\n- Feature 2\n";
    default:
      return "// New document\n";
  }
};
