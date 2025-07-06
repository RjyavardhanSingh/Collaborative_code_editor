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
import PublishRepositoryModal from "./PublishRepositoryModal";

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
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [repoStatus, setRepoStatus] = useState(null);
  const [folder, setFolder] = useState(null); // Add this to your useState declarations, near the top of the component

  // Add a ref to track the last change timestamp
  const lastChangeRef = useRef(Date.now());

  // Update the useEffect that runs when the component mounts
  useEffect(() => {
    // First, check if there's a token with valid format before trying to verify
    const token = localStorage.getItem("githubToken");

    // If no token or token doesn't have GitHub format, don't even try to verify
    if (!token || !token.startsWith("gho_")) {
      console.log("No valid GitHub token format found, clearing if needed");
      localStorage.removeItem("githubToken"); // Ensure it's removed
      setIsAuthenticated(false);
      return; // Exit early
    }

    // Only proceed with verification if we have a token that looks valid
    const checkTokenValidity = async () => {
      try {
        // Try to verify the token
        const response = await api.get(
          `/api/github/verify-token?token=${encodeURIComponent(token)}`
        );

        if (response.data.valid) {
          setIsAuthenticated(true);
        } else {
          console.log("Token verification failed, clearing token");
          localStorage.removeItem("githubToken");
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.log("Token verification failed, clearing token");
        localStorage.removeItem("githubToken");
        setIsAuthenticated(false);
      }
    };

    checkTokenValidity();
  }, []);

  // Then update the existing useEffect to only fetch data if we have a valid token
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

  // Add this function at the beginning of the component, after state declarations
  const verifyAndRefreshToken = async () => {
    try {
      const token = localStorage.getItem("githubToken");

      // Don't even try if no token exists
      if (!token) {
        setIsAuthenticated(false);
        return false;
      }

      // Skip verification if token format is invalid
      if (!token.startsWith("gho_")) {
        localStorage.removeItem("githubToken");
        setIsAuthenticated(false);
        return false;
      }

      try {
        const response = await api.get(
          `/api/github/verify-token?token=${encodeURIComponent(token)}`
        );

        if (response.data.valid) {
          console.log(
            "Token verified successfully for:",
            response.data.user?.login
          );
          setIsAuthenticated(true);
          return true;
        } else {
          localStorage.removeItem("githubToken");
          setIsAuthenticated(false);
          return false;
        }
      } catch (networkErr) {
        console.error("Network error during token verification:", networkErr);

        // CRITICAL FIX: Check if it's a 401 Unauthorized error and remove token
        if (networkErr.response?.status === 401) {
          console.log("401 Unauthorized error, clearing token");
          localStorage.removeItem("githubToken");
          setIsAuthenticated(false);
        }

        return false;
      }
    } catch (err) {
      console.error("Token verification failed:", err);
      localStorage.removeItem("githubToken");
      setIsAuthenticated(false);
      return false;
    }
  };

  // Modify the fetchRepositoryInfo function
  const fetchRepositoryInfo = async () => {
    if (!(await verifyAndRefreshToken())) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("githubToken");
      const { data } = await api.get(`/api/folders/${folderId}`);

      // Set folder data
      setFolder(data);

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

  // Modify the fetchStatus function
  const fetchStatus = async () => {
    // Don't attempt to get status if we're not authenticated yet
    if (!isAuthenticated || !folderId) {
      setStatus(null);
      return;
    }

    // Double-check if we have a GitHub token before making the API call
    const token = localStorage.getItem("githubToken");
    if (!token) {
      console.log("No GitHub token found for status check");
      setNeedsInitialization(true);
      return; // Don't show error, just return silently
    }

    try {
      console.log("Fetching git status for folder:", folderId);

      // Use query parameter for token
      const { data } = await api.get(
        `/api/github/status/${folderId}?token=${encodeURIComponent(token)}`
      );

      console.log("Git status response:", data);
      setStatus(data);
      setError(null);
    } catch (err) {
      // Handle error but don't show to user unless they've attempted to connect
      if (err.response?.status === 401) {
        // Just clear the token, don't show error message yet
        localStorage.removeItem("githubToken");
        setIsAuthenticated(false);
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

      // Get both tokens
      const githubToken = localStorage.getItem("githubToken");
      const authToken = localStorage.getItem("authToken");

      if (!githubToken) {
        setError("GitHub authentication required");
        setLoading(false);
        return;
      }

      // Prepare file data for commit - use folder documents instead of currentFiles
      let files = [];
      try {
        // Get all files from the server to ensure we have the latest content
        const docsResponse = await api.get(
          `/api/folders/${folderId}/documents`
        );
        files = docsResponse.data.map((doc) => ({
          path: doc.title,
          content: doc.content,
        }));
        console.log(
          "Committing files:",
          files.map((f) => f.path)
        );
      } catch (fetchErr) {
        console.error("Error fetching documents:", fetchErr);
        // Fallback to current files if fetch fails
        files = currentFiles.map((file) => ({
          path: file.title,
          content: file.content,
        }));
      }

      // Log request details for debugging
      console.log("Sending commit request with:", {
        folderId,
        messageLength: commitMessage.length,
        filesCount: files.length,
        token: githubToken ? `${githubToken.substring(0, 8)}...` : "missing",
      });

      const response = await api.post(
        "/api/github/commit",
        {
          folderId,
          message: commitMessage,
          files,
        },
        {
          headers: {
            // Send GitHub token as both Bearer and custom header
            Authorization: `token ${githubToken}`,
            "X-Github-Token": githubToken,
            // Also send app token if available
            ...(authToken && { "X-Auth-Token": authToken }),
          },
        }
      );

      console.log("Commit successful:", response.data);
      setCommitMessage("");

      // Refresh status after successful commit
      setTimeout(() => fetchStatus(), 500);
    } catch (err) {
      console.error("Commit error:", err);

      // Detailed error message
      let errorMsg = "Failed to commit changes";

      if (err.response?.status === 401) {
        errorMsg =
          "Unauthorized, GitHub token failed. Please reconnect your account.";
      } else if (err.response?.data?.message) {
        errorMsg = `Failed to commit: ${err.response.data.message}`;

        // Add Git details if available
        if (err.response.data.errorDetails?.gitMessage) {
          errorMsg += ` (${err.response.data.errorDetails.gitMessage})`;
        }
      } else if (err.message) {
        errorMsg = err.message;
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
  const handleInitializeRepo = async () => {
    try {
      // Check if the folder has a repository already
      const { data } = await api.get(`/api/folders/${folderId}`);

      if (!data.githubRepo || !data.githubRepo.fullName) {
        // Show create repository modal first
        setError("You need to create a GitHub repository first");
        setShowCreateRepoModal(true);
      } else {
        // Show initialize modal
        setShowInitModal(true);
      }
    } catch (err) {
      console.error("Failed to check repository status:", err);
      setError("Failed to check repository status");
    }
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

  // Add this function to handle successful publishing
  const handlePublishSuccess = (data) => {
    setShowPublishModal(false);

    if (data.repository) {
      setRepository(data.repository);
    }

    if (data.status) {
      setStatus(data.status);
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

  // Update the component to use the new VS Code-like flow

  // Add this function before the renderContent function

  // Add this function to handle local initialization
  const handleLocalInit = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("githubToken");
      if (!token) {
        setError("GitHub authentication required");
        setLoading(false);
        return;
      }

      console.log("Initializing local Git repository for folder:", folderId);

      const response = await api.post(
        `/api/github/local-init/${folderId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Local repository initialization response:", response.data);

      if (response.data.isGitRepo) {
        // IMPORTANT: Set repoStatus state to mark initialization
        setRepoStatus("initialized");
      }

      if (response.data.status) {
        setStatus(response.data.status);
      }

      // Refresh after initialization
      fetchStatus();

      // Notify parent component if callback provided
      if (onInitializeRepo) {
        onInitializeRepo(response.data);
      }
    } catch (err) {
      console.error("Failed to initialize local repository:", err);
      setError(
        err.response?.data?.message || "Failed to initialize local repository"
      );
    } finally {
      setLoading(false);
    }
  };

  // Update the renderContent function to display the proper workflow steps
  const renderContent = () => {
    // Add this debug log
    console.log("Current status object:", status);
    console.log("gitInitialized value:", status?.isGitRepo === true);
    console.log("repoStatus:", repoStatus);

    const hasChanges =
      status &&
      ((status.modified && status.modified.length > 0) ||
        (status.not_added && status.not_added.length > 0) ||
        (status.deleted && status.deleted.length > 0) ||
        (status.created && status.created.length > 0) ||
        (status.renamed && status.renamed.length > 0) ||
        (status.conflicted && status.conflicted.length > 0));

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

    // If not authenticated with GitHub, show connect button
    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-4">
          <FiGithub size={48} className="text-slate-400 mb-4" />
          <h3 className="text-slate-200 text-lg font-medium mb-2">
            Connect to GitHub
          </h3>
          <p className="text-slate-400 text-sm text-center mb-4">
            Connect your GitHub account to enable Git version control for this
            project.
          </p>
          <button
            onClick={() => initGitHubAuth()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <FiGithub /> Connect GitHub Account
          </button>
        </div>
      );
    }

    // Check if we have a repository already initialized
    if (repository?.isInitialized) {
      // Show the existing repository UI with changes, commit options, etc.
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
    }

    // VS Code-like workflow with two steps
    const gitInitialized =
      status?.isGitRepo === true ||
      status?.isNewRepo === true ||
      repoStatus === "initialized" ||
      (status && !status.needsInitialization);

    console.log("Final gitInitialized decision:", gitInitialized);

    return (
      <div className="flex flex-col items-center justify-center h-64 p-4">
        <FiGitBranch size={48} className="text-slate-400 mb-4" />
        <h3 className="text-slate-200 text-lg font-medium mb-2">
          Git Version Control
        </h3>

        {!gitInitialized ? (
          // Step 1: Initialize local repository
          <>
            <p className="text-slate-400 text-sm text-center mb-4">
              Start by initializing a local Git repository for this project
            </p>
            <button
              onClick={handleLocalInit}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <FiGitBranch /> Initialize Git Repository
            </button>
          </>
        ) : (
          // Step 2: Publish to GitHub
          <>
            <p className="text-slate-400 text-sm text-center mb-4">
              Local Git repository initialized. Now you can publish to GitHub.
            </p>
            <button
              onClick={() => setShowPublishModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <FiGithub /> Publish to GitHub
            </button>
          </>
        )}
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

      {showPublishModal && (
        <PublishRepositoryModal
          folderId={folderId}
          folderName={folder?.name || "My Project"}
          onClose={() => setShowPublishModal(false)}
          onSuccess={handlePublishSuccess}
        />
      )}
    </>
  );
}
