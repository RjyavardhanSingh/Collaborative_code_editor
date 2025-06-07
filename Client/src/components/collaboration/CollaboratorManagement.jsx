import { useState } from "react";
import { motion } from "framer-motion";
import { FiX, FiTrash2, FiEdit2, FiCheck, FiUserPlus } from "react-icons/fi";
import api from "../../lib/api";

export default function CollaboratorManagement({
  documentId,
  collaborators,
  setCollaborators,
  activeUsers,
  currentuser,
  onClose,
  onInviteClick,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editPermission, setEditPermission] = useState("");
  const [error, setError] = useState(null);

  const getRandomColor = (userId) => {
    const colors = [
      "#F87171",
      "#FB923C",
      "#FBBF24",
      "#A3E635",
      "#34D399",
      "#22D3EE",
      "#818CF8",
      "#C084FC",
    ];

    const hash = userId?.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  };

  const isOwner = (userId) => {
    return collaborators.find((c) => c.user._id === userId && c.isOwner);
  };

  const canManageCollaborators = () => {
    const userCollab = collaborators.find(
      (c) => c.user._id === currentuser?._id
    );
    return (
      userCollab && (userCollab.permission === "admin" || userCollab.isOwner)
    );
  };

  const handleChangePermission = async (collaboratorId, newPermission) => {
    try {
      setError(null);

      const updatedCollaborators = collaborators.map((c) =>
        c.user._id === collaboratorId ? { ...c, permission: newPermission } : c
      );

      const document = {
        collaborators: updatedCollaborators
          .filter((c) => !c.isOwner)
          .map((c) => ({
            user: c.user._id,
            permission: c.permission,
          })),
      };

      await api.put(`/api/documents/${documentId}`, document);

      setCollaborators(updatedCollaborators);
      setEditingId(null);
    } catch (err) {
      setError("Failed to update permission");
      console.error(err);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    try {
      setError(null);
      await api.delete(
        `/api/documents/${documentId}/collaborators/${collaboratorId}`
      );
      setCollaborators((prev) =>
        prev.filter((c) => c.user._id !== collaboratorId)
      );
    } catch (err) {
      setError("Failed to remove collaborator");
      console.error(err);
    }
  };

  const getOnlineStatus = (userId) => {
    return activeUsers.some((user) => user.id === userId);
  };

  const hasAdminRights = () => {
    const userCollab = collaborators.find(
      (c) => c.user._id === currentuser?._id
    );
    return (
      userCollab && (userCollab.permission === "admin" || userCollab.isOwner)
    );
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="absolute top-0 right-0 h-full w-[300px] border-l border-slate-700 bg-slate-800 overflow-y-auto shadow-xl z-10"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">Collaborators</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-500/20 border border-red-500/40 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-slate-300 text-sm font-medium mb-2">
            Active Users ({activeUsers.length})
          </h3>
          <div className="space-y-2">
            {activeUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center p-2 bg-slate-700/50 rounded"
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: getRandomColor(user._id) }}
                ></div>
                <span className="text-white text-sm">{user.username}</span>
                <div className="ml-auto flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            ))}
            {activeUsers.length === 0 && (
              <p className="text-slate-400 text-sm italic py-1">
                No active users
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-slate-300 text-sm font-medium mb-2">
            All Collaborators ({collaborators.length})
          </h3>
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div
                key={collab.user._id}
                className="flex flex-col p-2 bg-slate-700/50 rounded"
              >
                <div className="flex items-center">
                  {collab.user.avatar ? (
                    <img
                      src={collab.user.avatar}
                      alt={collab.user.username}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs mr-2">
                      {collab.user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-white text-sm flex-1">
                    {collab.user.username}
                    {collab.isOwner && (
                      <span className="ml-1 text-xs text-blue-400">
                        (Owner)
                      </span>
                    )}
                    {!collab.isOwner &&
                      collab.user._id === currentuser?._id && (
                        <span className="ml-1 text-xs text-green-400">
                          (You)
                        </span>
                      )}
                  </span>

                  <div className="flex items-center">
                    {getOnlineStatus(collab.user._id) && (
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    )}

                    <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                      {collab.permission}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {canManageCollaborators() && (
            <button
              onClick={onInviteClick}
              className="mt-4 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center justify-center"
            >
              <FiUserPlus className="mr-2" /> Invite More Collaborators
            </button>
          )}
        </div>

        {hasAdminRights() && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <h3 className="text-slate-300 text-sm font-medium mb-2">
              Manage Collaborators
            </h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="text-left pb-2">User</th>
                  <th className="text-left pb-2">Permission</th>
                  <th className="text-right pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collaborators
                  .filter((c) => !c.isOwner)
                  .map((collab) => (
                    <tr
                      key={collab.user._id}
                      className="border-t border-slate-700/50"
                    >
                      <td className="py-2 flex items-center">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs mr-2">
                          {collab.user.username?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="text-white truncate max-w-[80px]">
                          {collab.user.username}
                        </span>
                      </td>
                      <td className="py-2">
                        <select
                          value={collab.permission}
                          onChange={(e) =>
                            handleChangePermission(
                              collab.user._id,
                              e.target.value
                            )
                          }
                          className="text-xs bg-slate-600 border border-slate-500 text-white rounded px-1 py-0.5"
                        >
                          <option value="read">Read only</option>
                          <option value="write">Can edit</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() =>
                            handleRemoveCollaborator(collab.user._id)
                          }
                          className="text-red-400 hover:text-red-300 px-1"
                          title="Remove collaborator"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
