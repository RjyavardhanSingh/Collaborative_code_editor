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
  isFolder = false,
  activeDocuments = {},
  position = "default", // Add this new prop
  className, // Accept className prop
}) {
  const [editingId, setEditingId] = useState(null);
  const [editPermission, setEditPermission] = useState("");
  const [error, setError] = useState(null);

  // FIXED: Better API path handling
  const getApiPath = (action, collaboratorId = "") => {
    if (isFolder) {
      switch (action) {
        case "remove":
          return `/api/folders/${documentId}/collaborators/${collaboratorId}`;
        case "update":
          return `/api/folders/${documentId}/collaborators/${collaboratorId}`;
        default:
          return `/api/folders/${documentId}/collaborators/`;
      }
    } else {
      switch (action) {
        case "remove":
          return `/api/documents/${documentId}/collaborators/${collaboratorId}`;
        case "update":
          return `/api/documents/${documentId}`;
        default:
          return `/api/documents/${documentId}/collaborators/`;
      }
    }
  };

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

      // FIXED: Use different API calls for folders vs documents
      if (isFolder) {
        // For folders, use the folder collaborator API
        await api.put(
          `/api/folders/${documentId}/collaborators/${collaboratorId}`,
          {
            permission: newPermission,
          }
        );
      } else {
        // For documents, use the document API
        const document = {
          collaborators: updatedCollaborators
            .filter((c) => !c.isOwner)
            .map((c) => ({
              user: c.user._id,
              permission: c.permission,
            })),
        };

        await api.put(`/api/documents/${documentId}`, document);
      }

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
      await api.delete(getApiPath("remove", collaboratorId));
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

  // Add this helper function to get current document for a user
  const getCurrentDocument = (userId) => {
    const activeDoc = activeDocuments[userId];
    console.log("Active document for user", userId, ":", activeDoc); // Debug log
    return activeDoc || null;
  };

  // Add this helper function to check if user is currently active
  const isUserActive = (userId) => {
    return activeUsers.some(
      (user) => user._id === userId || user.id === userId
    );
  };

  const getPositionClasses = () => {
    if (position === "navbar-aware") {
      // For FolderEditor with navbar
      return "absolute top-16 right-0 h-[calc(100%-4rem)] w-[350px]";
    } else if (position === "full-height") {
      // For DocumentEditor container
      return "absolute top-0 right-0 h-full w-[350px]";
    } else {
      // Default behavior based on isFolder
      return `absolute ${
        isFolder ? "top-16 h-[calc(100%-4rem)]" : "top-0 h-full"
      } right-0 w-[350px]`;
    }
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className={`${getPositionClasses()} border-l border-slate-700 bg-slate-800 overflow-y-auto shadow-xl z-10`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">
            {isFolder ? "Project Collaborators" : "Document Collaborators"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-500/20 border border-red-500/40 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Active Users Section - New Enhanced Version */}
        <div className="mb-6">
          <h3 className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Currently Active ({activeUsers.length})
          </h3>

          {activeUsers.length > 0 ? (
            <div className="space-y-3">
              {activeUsers.map((user) => {
                const currentDoc = getCurrentDocument(user._id || user.id);
                return (
                  <div
                    key={user._id || user.id}
                    className="flex items-start p-3 bg-slate-700/50 rounded-lg border-l-4 border-green-500"
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-3 mt-1 flex-shrink-0"
                      style={{
                        backgroundColor: getRandomColor(user._id || user.id),
                      }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium truncate">
                          {user.username}
                        </span>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                      {currentDoc ? (
                        <div className="mt-1">
                          <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                            📝 Editing:{" "}
                            {currentDoc.documentTitle ||
                              currentDoc.documentTitle ||
                              "Unknown file"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 mt-1 block">
                          🕐 Currently browsing
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 bg-slate-700/30 rounded-lg text-center">
              <p className="text-slate-400 text-sm">
                No users currently active
              </p>
            </div>
          )}
        </div>

        {/* All Collaborators Section - Enhanced */}
        <div>
          <h3 className="text-slate-300 text-sm font-medium mb-3">
            All Collaborators ({collaborators.length})
          </h3>
          <div className="space-y-2">
            {collaborators.map((collab) => {
              const isActive = isUserActive(collab.user._id);
              const currentDoc = getCurrentDocument(collab.user._id);

              return (
                <div
                  key={collab.user._id}
                  className={`flex flex-col p-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-slate-700/70 border border-green-500/30"
                      : "bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-center">
                    {collab.user.avatar ? (
                      <img
                        src={collab.user.avatar}
                        alt={collab.user.username}
                        className="w-7 h-7 rounded-full mr-3"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs mr-3">
                        {collab.user.username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm flex-1 truncate">
                          {collab.user.username}
                        </span>

                        {/* Activity indicator */}
                        {isActive && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>

                      {/* User status badges */}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                          {collab.permission}
                        </span>

                        {collab.isOwner && (
                          <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded">
                            Owner
                          </span>
                        )}

                        {!collab.isOwner &&
                          collab.user._id === currentuser?._id && (
                            <span className="text-xs bg-green-600 px-2 py-0.5 rounded">
                              You
                            </span>
                          )}
                      </div>

                      {/* Current activity */}
                      {isActive && currentDoc && (
                        <div className="mt-2">
                          <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded block">
                            📝 Currently editing:{" "}
                            {currentDoc.documentTitle || "Unknown file"}
                          </span>
                        </div>
                      )}

                      {isActive && !currentDoc && (
                        <div className="mt-2">
                          <span className="text-xs text-slate-400">
                            🕐 Browsing project
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite button */}
        {canManageCollaborators() && (
          <button
            onClick={onInviteClick}
            className="mt-4 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center justify-center"
          >
            <FiUserPlus className="mr-2" /> Invite More Collaborators
          </button>
        )}

        {/* Management section for admins */}
        {hasAdminRights() && (
          <div className="mt-6 border-t border-slate-700 pt-4">
            <h3 className="text-slate-300 text-sm font-medium mb-3">
              Manage Permissions
            </h3>
            <div className="space-y-2">
              {collaborators
                .filter((c) => !c.isOwner)
                .map((collab) => (
                  <div
                    key={collab.user._id}
                    className="flex items-center justify-between p-2 bg-slate-700/30 rounded"
                  >
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs mr-2">
                        {collab.user.username?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <span className="text-white text-sm truncate max-w-[100px]">
                        {collab.user.username}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={collab.permission}
                        onChange={(e) =>
                          handleChangePermission(
                            collab.user._id,
                            e.target.value
                          )
                        }
                        className="text-xs bg-slate-600 border border-slate-500 text-white rounded px-2 py-1"
                      >
                        <option value="read">Read only</option>
                        <option value="write">Can edit</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button
                        onClick={() =>
                          handleRemoveCollaborator(collab.user._id)
                        }
                        className="text-red-400 hover:text-red-300 px-1"
                        title="Remove collaborator"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
