import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiGitBranch,
  FiX,
  FiLock,
  FiGlobe,
  FiFileText,
  FiCheck,
} from "react-icons/fi";
import api from "../../lib/api";

export default function InitRepositoryModal({
  folderId,
  repositoryName,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [addReadme, setAddReadme] = useState(true);
  const [branch, setBranch] = useState("main");

  useEffect(() => {
    const checkRepository = async () => {
      try {
        const { data } = await api.get(`/api/folders/${folderId}`);
        if (!data.githubRepo || !data.githubRepo.fullName) {
          setError(
            "You need to create a GitHub repository first before initializing. Please close this modal and click 'Create Repository' instead."
          );
        }
      } catch (err) {
        console.error("Failed to check repository status:", err);
      }
    };

    checkRepository();
  }, [folderId]);

  const handleInit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Get GitHub token
      const token = localStorage.getItem("githubToken");
      if (!token) {
        setError("GitHub authentication required");
        return;
      }

      console.log(`Initializing repository for folder: ${folderId}`);

      // Make sure to include the token in the Authorization header
      const response = await api.post(
        `/api/github/init/${folderId}`,
        {
          isPrivate,
          addReadme,
          defaultBranch: branch,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Repository initialized successfully:", response.data);

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error("Repository initialization error:", err);

      if (err.response?.status === 404) {
        setError(
          "Initialization endpoint not found. Please check server configuration."
        );
      } else {
        setError(
          err.response?.data?.message || "Failed to initialize repository"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FiGitBranch className="text-blue-400" /> Initialize Repository
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleInit}>
          <div className="mb-6">
            <p className="text-slate-300 mb-4">
              You'll be initializing GitHub repository for:
              <span className="font-medium text-white ml-1">
                {repositoryName}
              </span>
            </p>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mr-2 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <label
                  htmlFor="isPrivate"
                  className="flex items-center gap-1.5 text-slate-300"
                >
                  <FiLock
                    className={isPrivate ? "text-blue-400" : "text-slate-400"}
                  />
                  Private repository
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="addReadme"
                  checked={addReadme}
                  onChange={(e) => setAddReadme(e.target.checked)}
                  className="mr-2 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <label
                  htmlFor="addReadme"
                  className="flex items-center gap-1.5 text-slate-300"
                >
                  <FiFileText
                    className={addReadme ? "text-blue-400" : "text-slate-400"}
                  />
                  Initialize with a README file
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Default Branch
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-blue-800 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <FiGitBranch className="animate-spin" /> Initializing...
                </>
              ) : (
                <>
                  <FiCheck /> Initialize Repository
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
