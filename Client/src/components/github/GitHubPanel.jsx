import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  FiGitBranch,
  FiGitCommit,
  FiGitPullRequest,
  FiPlus,
  FiRefreshCw,
  FiX,
  FiCheck,
  FiUpload,
  FiDownload,
  FiGitMerge,
  FiGithub,
} from "react-icons/fi";
import api from "../../lib/api";
import { isGitHubAuthenticated, initGitHubAuth } from "../../lib/githubAuth";
import CreateRepositoryModal from "./CreateRepositoryModal";
import InitRepositoryModal from "./InitRepositoryModal";

export default function GitHubPanel({
  folderId,
  onClose,
  refreshFiles,
  currentFiles = [],
  onInitializeRepo, // Receive the prop
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [repository, setRepository] = useState(null);
  const [status, setStatus] = useState(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [activeTab, setActiveTab] = useState("changes");
  const [isAuthenticated, setIsAuthenticated] = useState(
    isGitHubAuthenticated()
  );
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false);
  const [needsInitialization, setNeedsInitialization] = useState(false); // Add this state variable
  const [repoFiles, setRepoFiles] = useState([]); // Add this state to the top of your component
  const [showInitModal, setShowInitModal] = useState(false); // Add state for initialization modal

  // Add a ref to track the last change timestamp
  const lastChangeRef = useRef(Date.now());

  useEffect(() => {
    if (isAuthenticated && folderId) {
      fetchRepositoryInfo();
      fetchStatus();
    }
  }, [folderId, isAuthenticated]);

  // Add auto-polling for changes
  useEffect(() => {
    if (!isAuthenticated || !folderId || !repository) return;

    // Initial status fetch
    fetchStatus();

    // Set up polling to check Git status every 3 seconds
    const intervalId = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [folderId, repository, isAuthenticated]);

  // Add effect to watch for file changes
  useEffect(() => {
    if (!currentFiles || currentFiles.length === 0) return;

    // When a file changes, mark it for Git sync
    currentFiles.forEach((file) => {
      if (file && file._id) {
        // Mark that files have changed
        lastChangeRef.current = Date.now();
      }
    });
  }, [currentFiles]);

  const fetchRepositoryInfo = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/folders/${folderId}`);

      if (data.githubRepo) {
        setRepository(data.githubRepo);
      }
    } catch (err) {
      setError("Failed to load repository information");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update the fetchStatus function
  const fetchStatus = async () => {
    if (!isAuthenticated || !folderId) {
      setStatus(null);
      return;
    }

    // Verify we have a GitHub token before making the request
    const token = localStorage.getItem("githubToken");
    if (!token) {
      console.log("No GitHub token found, initiating GitHub auth");
      setNeedsInitialization(true);
      setError("GitHub authentication required");
      return;
    }

    try {
      console.log("Fetching git status for folder:", folderId);

      const { data } = await api.get(`/api/github/status/${folderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { t: Date.now() }, // Cache busting
      });

      console.log("Git status response:", data);
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch Git status:", err);

      if (err.response?.status === 401) {
        setError(
          "GitHub authentication expired. Please reconnect your GitHub account."
        );
        // Clear the invalid token
        localStorage.removeItem("githubToken");
        setIsAuthenticated(false);
      } else if (err.response?.status === 404) {
        setNeedsInitialization(true);
        setError("No GitHub repository connected to this project");
      } else {
        setError("Failed to get repository status");
      }
    }
  };

  const fetchRepoFileTree = async () => {
    try {
      const { data } = await api.get(`/api/github/files/${folderId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("githubToken")}`,
        },
      });
      setRepoFiles(data);
    } catch (err) {
      console.error("Failed to fetch repository file structure:", err);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage) {
      setError("Please enter a commit message");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare file data for commit
      const files = currentFiles.map((file) => ({
        path: file.title,
        content: file.content,
      }));

      console.log(
        "Committing files:",
        files.map((f) => f.path)
      );

      const response = await api.post(
        "/api/github/commit",
        {
          folderId,
          message: commitMessage,
          files,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("githubToken")}`,
          },
        }
      );

      console.log("Commit successful:", response.data);
      setCommitMessage("");
      fetchStatus();
    } catch (err) {
      console.error("Commit error:", err);

      // More user-friendly and detailed error message
      let errorMsg = "Failed to commit changes";

      if (err.response?.data) {
        const data = err.response.data;
        errorMsg += `: ${data.message || ""}`;

        // Add Git command details if available
        if (data.command) {
          errorMsg += ` [Command: ${data.command}]`;
        }

        // Add Git error message if available
        if (data.gitMessage) {
          errorMsg += ` (${data.gitMessage})`;
        }
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRepo = async () => {
    if (!isAuthenticated) {
      initGitHubAuth();
      return;
    }

    // If authenticated but no repo, show repo creation modal
    setShowCreateRepoModal(true);
  };

  // Add this to handle successful repo creation
  const handleRepoCreationSuccess = (repoData) => {
    setShowCreateRepoModal(false);
    fetchRepositoryInfo(); // Refresh repo info after creation
  };

  // Replace the handleInitializeRepo function with this
  const handleInitializeRepo = () => {
    // Use the internal modal instead of relying on a callback
    setShowInitModal(true);
  };

  // Add this function to handle successful initialization
  const handleInitSuccess = (data) => {
    setShowInitModal(false);

    if (data.status) {
      setStatus(data.status);
      setNeedsInitialization(false);
    }

    if (data.repository) {
      setRepository(data.repository);
    }

    // Refresh after a short delay
    setTimeout(() => {
      fetchRepositoryInfo();
      fetchStatus();
    }, 1000);
  };

  const syncFilesToRepo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all files in the current folder
      const filesResponse = await api.get(`/api/folders/${folderId}/documents`);
      const files = filesResponse.data.map((file) => ({
        path: file.title,
        content: file.content,
      }));

      // Sync files to repo
      await api.post(
        `/api/github/sync/${folderId}`,
        { files },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("githubToken")}`,
          },
        }
      );

      // Refresh status after sync
      fetchStatus();
    } catch (err) {
      setError(
        "Failed to sync files: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // Render different content based on connection status
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-md text-red-400 text-sm">
          {error}
        </div>
      );
    }

    if (!repository) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-4">
          <FiGitBranch size={48} className="text-slate-400 mb-4" />
          <h3 className="text-slate-200 text-lg font-medium mb-2">
            Initialize Repository
          </h3>
          <p className="text-slate-400 text-sm text-center mb-4">
            Your GitHub account is connected. Now you need to create a
            repository for this project.
          </p>
          <button
            onClick={handleConnectRepo}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus /> Create New Repository
          </button>
        </div>
      );
    }

    // Handle the case when we need initialization but we have repository details
    if (status?.needsInitialization === true) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-4">
          <FiGitBranch size={48} className="text-slate-400 mb-4" />
          <h3 className="text-slate-200 text-lg font-medium mb-2">
            Initialize Git Repository
          </h3>
          <p className="text-slate-400 text-sm text-center mb-4">
            Your GitHub account is connected to {repository.fullName}, but the
            local Git repository needs to be initialized.
          </p>
          <button
            onClick={handleInitializeRepo}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <FiGitBranch /> Initialize Repository
          </button>
        </div>
      );
    }

    // Make sure all collections are defined before accessing their length
    const hasChanges =
      (status?.modified || []).length > 0 ||
      (status?.not_added || []).length > 0 ||
      (status?.deleted || []).length > 0 ||
      (status?.created || []).length > 0 ||
      (status?.renamed || []).length > 0 ||
      (status?.conflicted || []).length > 0;

    return (
      <div className="p-4">
        {/* Repository info */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FiGitBranch className="text-blue-500" />
            <h3 className="text-lg font-medium text-white">
              {repository.name}
            </h3>
          </div>
          <p className="text-sm text-slate-400">
            Connected to {repository.owner}/{repository.name}
          </p>
          {repository.lastSynced && (
            <p className="text-xs text-slate-500 mt-1">
              Last synced: {new Date(repository.lastSynced).toLocaleString()}
            </p>
          )}
        </div>

        {/* Changes section */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Changes</h4>

          {hasChanges ? (
            <div className="text-sm text-slate-400">
              {/* Modified files */}
              {(status?.modified || []).length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-slate-300 mb-1">
                    Modified
                  </h5>
                  {(status?.modified || []).map((file) => (
                    <div
                      key={file}
                      className="flex items-center py-1 text-blue-400"
                    >
                      <span className="ml-2">{file}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* New files */}
              {(status?.not_added || []).length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-slate-300 mb-1">
                    New Files
                  </h5>
                  {(status?.not_added || []).map((file) => (
                    <div
                      key={file}
                      className="flex items-center py-1 text-green-400"
                    >
                      <span className="ml-2">{file}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Deleted files */}
              {(status?.deleted || []).length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-slate-300 mb-1">
                    Deleted
                  </h5>
                  {(status?.deleted || []).map((file) => (
                    <div
                      key={file}
                      className="flex items-center py-1 text-red-400"
                    >
                      <span className="ml-2">{file}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Other change types if needed */}
              {(status?.created || []).length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-slate-300 mb-1">
                    Created
                  </h5>
                  {(status?.created || []).map((file) => (
                    <div
                      key={file}
                      className="flex items-center py-1 text-green-400"
                    >
                      <span className="ml-2">{file}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Renamed files */}
              {(status?.renamed || []).length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-slate-300 mb-1">
                    Renamed
                  </h5>
                  {(status?.renamed || []).map((file) => (
                    <div
                      key={`${file.from}-${file.to}`}
                      className="flex items-center py-1 text-blue-400"
                    >
                      <span className="ml-2">
                        {file.from} → {file.to}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Conflicted files */}
              {(status?.conflicted || []).length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-slate-300 mb-1">
                    Conflicts
                  </h5>
                  {(status?.conflicted || []).map((file) => (
                    <div
                      key={file}
                      className="flex items-center py-1 text-yellow-400"
                    >
                      <span className="ml-2">{file}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-400 p-3 bg-slate-800/50 rounded-md">
              No changes detected in your project files
            </div>
          )}
        </div>

        {/* Commit section */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Commit</h4>
          <div className="mb-3">
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-md border border-slate-700 p-2 text-sm"
              placeholder="Commit message"
              rows={2}
            ></textarea>
          </div>
          <button
            onClick={handleCommit}
            disabled={!hasChanges}
            className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <FiGitBranch /> Commit & Push Changes
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="absolute top-0 right-0 h-full w-[350px] border-l border-slate-700 bg-slate-800 overflow-auto shadow-xl z-10"
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-white font-bold flex items-center gap-2">
            <FiGitBranch /> Git Version Control
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 m-4 p-2 rounded-md text-sm text-red-400">
            {error}
          </div>
        )}

        {renderContent()}

        {error && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <button
              onClick={handleInitializeRepo}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <FiRefreshCw /> Re-initialize Repository
            </button>
          </div>
        )}
      </motion.div>

      {/* Add repository creation modal */}
      {showCreateRepoModal && (
        <CreateRepositoryModal
          folderId={folderId}
          folderName={repository?.name || "My Project"}
          onClose={() => setShowCreateRepoModal(false)}
          onSuccess={handleRepoCreationSuccess}
        />
      )}

      {/* Initialization modal */}
      {showInitModal && (
        <InitRepositoryModal
          folderId={folderId}
          repositoryName={repository?.name || ""}
          onClose={() => setShowInitModal(false)}
          onSuccess={handleInitSuccess}
        />
      )}
    </>
  );
}
