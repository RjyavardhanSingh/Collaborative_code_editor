import React, { useState } from "react";
import { motion } from "framer-motion";
import { FiFolder, FiX } from "react-icons/fi";

export default function FolderCreateDialog({
  onClose,
  onCreateFolder,
  parentFolderId,
}) {
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!folderName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }

    onCreateFolder(folderName);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 border border-slate-700 rounded-lg p-5 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <FiFolder className="text-blue-400" />
            {parentFolderId ? "Create Subfolder" : "Create Folder"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 py-2 px-3 bg-red-900/30 border border-red-500/40 rounded text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="folderName"
              className="block mb-2 text-sm font-medium text-slate-300"
            >
              Folder Name
            </label>
            <input
              type="text"
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="My Project"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 text-sm font-medium text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800"
            >
              Create
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
