import React, { useState } from "react";
import { FiFolder, FiX } from "react-icons/fi";
import { motion } from "framer-motion";
import api from "../../lib/api";

export default function FolderCreateDialog({
  onClose,
  onFolderCreated,
  parentFolder = null,
}) {
  const [folderName, setFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!folderName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data } = await api.post("/api/folders", {
        name: folderName,
        parentFolder,
      });

      onFolderCreated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create folder");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FiFolder className="text-blue-400" /> New Folder
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="folderName"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Folder Name
            </label>
            <input
              type="text"
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter folder name"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-md hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-70 flex items-center"
            >
              {isLoading ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
