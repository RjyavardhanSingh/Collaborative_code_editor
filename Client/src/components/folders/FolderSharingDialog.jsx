import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiFolder,
  FiX,
  FiUsers,
  FiUserPlus,
  FiTrash2,
  FiCheck,
  FiInfo,
} from "react-icons/fi";
import api from "../../lib/api";

export default function FolderSharingDialog({ folderId, onClose }) {
  const [folder, setFolder] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("read");
  const [inviteStatus, setInviteStatus] = useState(null);

  useEffect(() => {
    const fetchFolder = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/folders/${folderId}`);
        setFolder(data);
        setCollaborators(data.collaborators || []);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch folder:", err);
        setError("Failed to load folder information");
      } finally {
        setLoading(false);
      }
    };

    if (folderId) {
      fetchFolder();
    }
  }, [folderId]);

  const handleInvite = async (e) => {
    e.preventDefault();

    try {
      setInviteStatus({ loading: true });
      await api.post(`/api/folders/${folderId}/collaborators`, {
        email,
        permission,
      });

      // Refresh collaborators list
      const { data } = await api.get(`/api/folders/${folderId}`);
      setCollaborators(data.collaborators || []);

      setInviteStatus({
        success: true,
        message: "Invitation sent successfully",
      });
      setEmail("");
    } catch (err) {
      console.error("Failed to invite user:", err);
      setInviteStatus({
        error: true,
        message: err.response?.data?.message || "Failed to send invitation",
      });
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    try {
      await api.delete(`/api/folders/${folderId}/collaborators/${userId}`);

      // Update local state
      setCollaborators(collaborators.filter((c) => c.user._id !== userId));
    } catch (err) {
      console.error("Failed to remove collaborator:", err);
      setError("Failed to remove collaborator");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 w-full max-w-md flex flex-col items-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-3"></div>
          <p className="text-slate-300">Loading project sharing options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 border border-slate-700 rounded-lg p-5 w-full max-w-md max-h-[80vh] overflow-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <FiFolder className="text-blue-400" />
            Share Project: {folder?.name}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/40 rounded-md">
            <p className="text-sm text-red-400 flex items-center gap-2">
              <FiInfo /> {error}
            </p>
          </div>
        )}

        <div className="mb-6">
          <div className="bg-slate-700/50 p-3 rounded-md mb-4">
            <p className="text-sm text-slate-300">
              Sharing this project will give collaborators access to all files
              within it. You can set individual permissions for each
              collaborator.
            </p>
          </div>

          <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
            <FiUserPlus className="text-blue-400" /> Invite Collaborators
          </h4>

          <form onSubmit={handleInvite} className="mb-4">
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 flex-grow p-2.5"
                required
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 w-24 p-2.5"
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={inviteStatus?.loading}
              className="w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-800 disabled:opacity-70"
            >
              {inviteStatus?.loading ? "Sending..." : "Send Invitation"}
            </button>
          </form>

          {inviteStatus?.success && (
            <div className="mb-4 p-2 bg-green-900/30 border border-green-500/40 rounded-md flex items-center gap-2">
              <FiCheck className="text-green-400" />
              <p className="text-sm text-green-400">{inviteStatus.message}</p>
            </div>
          )}

          {inviteStatus?.error && (
            <div className="mb-4 p-2 bg-red-900/30 border border-red-500/40 rounded-md flex items-center gap-2">
              <FiInfo className="text-red-400" />
              <p className="text-sm text-red-400">{inviteStatus.message}</p>
            </div>
          )}
        </div>

        <div>
          <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
            <FiUsers className="text-blue-400" /> Current Collaborators
          </h4>

          {collaborators.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {collaborators.map((collab) => (
                <div
                  key={collab.user._id}
                  className="bg-slate-700/50 p-2.5 rounded-md flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600/30 rounded-full flex items-center justify-center">
                      {collab.user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-slate-200">
                        {collab.user.username}
                      </p>
                      <p className="text-xs text-slate-400">
                        {collab.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                      {collab.permission}
                    </span>
                    <button
                      onClick={() => handleRemoveCollaborator(collab.user._id)}
                      className="text-slate-400 hover:text-red-400 p-1"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center p-3 bg-slate-700/30 rounded-md">
              This project doesn't have any collaborators yet
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
