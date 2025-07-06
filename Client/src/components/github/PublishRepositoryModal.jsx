import { useState } from "react";
import { motion } from "framer-motion";
import {
  FiGithub,
  FiX,
  FiLock,
  FiGlobe,
  FiCheck,
  FiFileText,
} from "react-icons/fi";
import { publishToGitHub } from "../../lib/githubAuth";

export default function PublishRepositoryModal({
  folderId,
  folderName,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState(folderName?.replace(/\s+/g, "_") || "");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [addReadme, setAddReadme] = useState(true);
  const [repoStatus, setRepoStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Repository name is required");
      return;
    }

    // Validate repository name (GitHub restrictions)
    const nameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!nameRegex.test(name)) {
      setError(
        "Repository name can only contain letters, numbers, periods, underscores, and dashes"
      );
      return;
    }

    try {
      const options = {
        name,
        description,
        isPrivate,
        addReadme,
      };

      const result = await publishToGitHub(
        folderId,
        options,
        setLoading,
        setError,
        setRepoStatus
      );

      if (result && onSuccess) {
        onSuccess({
          repository: {
            name,
            owner: "your-username", // This will be updated from server response
            fullName: `your-username/${name}`, // This will be updated from server response
            isPrivate,
          },
          status: {
            isGitRepo: true,
            needsInitialization: false,
          },
        });
      }
    } catch (err) {
      console.error("Publish repository error:", err);
      setError(err.message || "Failed to publish repository");
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
            <FiGithub className="text-blue-400" /> Publish to GitHub
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-900/30 border border-red-500/30 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm text-slate-300 mb-1"
              >
                Repository Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                placeholder="my-project"
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm text-slate-300 mb-1"
              >
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                placeholder="A brief description of your project"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between pt-2 pb-1">
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
                  {isPrivate ? (
                    <FiLock className="text-blue-400" />
                  ) : (
                    <FiGlobe className="text-slate-400" />
                  )}
                  {isPrivate ? "Private repository" : "Public repository"}
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 pb-1">
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
                  Add a README file
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 mr-2"
              disabled={loading}
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
                  <FiGithub className="animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <FiCheck /> Publish Repository
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
