import { useState } from "react";
import { motion } from "framer-motion";
import { FiGitBranch, FiX, FiLock, FiGlobe, FiCheck } from "react-icons/fi";
import api from "../../lib/api";

export default function CreateRepositoryModal({
  folderId,
  folderName,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState(folderName || "");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (!name.trim()) {
        setError("Repository name is required");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("githubToken");
      if (!token) {
        setError("GitHub authentication required");
        return;
      }

      console.log("Creating repository:", {
        name,
        description,
        isPrivate,
        folderId,
      });

      const { data } = await api.post(
        "/api/github/repos",
        {
          name,
          description,
          isPrivate,
          folderId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Repository created successfully:", data);

      if (onSuccess) {
        onSuccess(data.repository);
      }
    } catch (err) {
      console.error("Repository creation error:", err);
      setError(err.response?.data?.message || "Failed to create repository");
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
            <FiGitBranch className="text-blue-400" /> Create Repository
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

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <p className="text-slate-300 mb-4">
              You'll be creating a new GitHub repository for:
              <span className="font-medium text-white ml-1">{folderName}</span>
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  <FiGitBranch className="animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <FiCheck /> Create Repository
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
