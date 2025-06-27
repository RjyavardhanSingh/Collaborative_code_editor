import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { motion } from "framer-motion";
import {
  FiPlus,
  FiSearch,
  FiFolder,
  FiUsers,
  FiGrid,
  FiInfo,
  FiFolderPlus,
  FiTrash2,
  FiEdit,
  FiClock,
  FiArrowRight,
  FiX,
} from "react-icons/fi";
import api from "../../lib/api.js";
import Navbar from "../../components/layout/NavBar";

export default function Projects() {
  const { currentuser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [folders, setFolders] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const navigate = useNavigate();

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get("/api/folders");
      
      // Sort folders by updatedAt date (newest first)
      const sortedFolders = response.data.sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      
      setFolders(sortedFolders || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
      setError("Failed to load projects. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentuser?._id) {
      fetchFolders();
    }
  }, [currentuser]);

  const handleCreateProject = async () => {
    try {
      if (!projectName.trim()) {
        setError("Project name cannot be empty");
        return;
      }

      const response = await api.post("/api/folders", {
        name: projectName,
        parentFolder: null, // Root level folder
      });

      setProjectName("");
      setShowNewProjectModal(false);
      fetchFolders();
    } catch (error) {
      console.error("Error creating project:", error);
      if (error.response) {
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
    return date.toLocaleDateString();
  };

  const handleDeleteProject = async (folderId) => {
    if (!confirm("Are you sure you want to delete this project? This will delete all files within it.")) {
      return;
    }
    
    try {
      await api.delete(`/api/folders/${folderId}`);
      fetchFolders();
    } catch (error) {
      console.error("Error deleting project:", error);
      setError("Failed to delete project");
    }
  };

  const handleEditProject = (folder) => {
    const newName = prompt("Enter new project name", folder.name);
    if (!newName || newName === folder.name) return;
    
    api.put(`/api/folders/${folder._id}`, { name: newName })
      .then(() => fetchFolders())
      .catch(err => {
        console.error("Error updating project name:", err);
        setError("Failed to update project name");
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <motion.div
            className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          ></motion.div>
          <p className="mt-6 text-slate-300 text-lg">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Background elements (reuse from Dashboard) */}
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
        title="Projects"
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
                  placeholder="Search projects..."
                />
              </div>
            </div>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-4 py-2 rounded-md text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-indigo-900/20"
            >
              <FiFolder className="text-white" /> New Project
            </button>
          </>
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
            className="px-4 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm text-white"
          >
            <span className="flex items-center gap-2">
              <FiFolder /> Projects
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

          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">All Projects</h1>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-md text-sm flex items-center gap-2"
            >
              <FiFolderPlus /> Create Project
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {folders.filter(folder => !folder.parentFolder).map((folder) => (
              <motion.div
                key={folder._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="group bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-purple-700/40 transition-all"
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => navigate(`/folders/${folder._id}`)}
                >
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-700/30 flex items-center justify-center text-purple-400 mb-4">
                    <FiFolder size={24} />
                  </div>
                  <h4 className="text-white font-medium text-lg">
                    {folder.name}
                  </h4>
                  <p className="text-sm text-slate-400 mt-1">
                    {folder.documents?.length || 0} files
                  </p>
                  <p className="text-xs text-slate-500 mt-2 flex items-center">
                    <FiClock className="mr-1" size={12} /> Updated {formatDate(folder.updatedAt)}
                  </p>
                </div>
                <div className="bg-slate-800/80 border-t border-slate-700 px-5 py-3 flex justify-between items-center">
                  <button
                    onClick={() => navigate(`/folders/${folder._id}`)}
                    className="text-xs font-medium text-slate-300 hover:text-white flex items-center"
                  >
                    Open <FiArrowRight className="ml-1" size={12} />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(folder);
                      }}
                      className="p-1.5 rounded-md bg-slate-700/50 text-slate-400 hover:text-blue-400 hover:bg-slate-700"
                    >
                      <FiEdit size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(folder._id);
                      }}
                      className="p-1.5 rounded-md bg-slate-700/50 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {folders.filter(folder => !folder.parentFolder).length === 0 && (
              <div className="col-span-full p-12 text-center bg-slate-800/30 border border-slate-700/50 rounded-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-full mx-auto flex items-center justify-center mb-4 border border-purple-700/30">
                  <FiFolder className="text-purple-400" size={36} />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No Projects Yet</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Create your first project to organize your files and collaborate with others
                </p>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-md text-sm flex items-center gap-2 mx-auto"
                >
                  <FiFolderPlus /> Create First Project
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Project Modal - reuse from Dashboard */}
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