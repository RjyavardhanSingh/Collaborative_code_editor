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
  FiFile,
  FiChevronRight,
  FiChevronDown,
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
  const [folderDocuments, setFolderDocuments] = useState([]);
  const [folderTree, setFolderTree] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [shareOption, setShareOption] = useState("entire"); // "entire" or "selective"
  const [expandedFolders, setExpandedFolders] = useState({});

  useEffect(() => {
    const fetchFolderAndDocuments = async () => {
      try {
        setLoading(true);
        // Fetch folder data
        const folderResponse = await api.get(`/api/folders/${folderId}`);
        setFolder(folderResponse.data);

        // Fetch collaborators
        const collabResponse = await api.get(
          `/api/folders/${folderId}/collaborators`
        );
        setCollaborators(collabResponse.data?.collaborators || []);

        // Fetch documents in this folder
        const docsResponse = await api.get(
          `/api/folders/${folderId}/documents`
        );

        // Save both the flat list and the tree structure
        if (docsResponse.data) {
          setFolderDocuments(docsResponse.data.flatDocuments || []);
          setFolderTree(docsResponse.data.treeStructure || null);

          // Expand root folder by default
          setExpandedFolders({ [folderId]: true });
        }

        setError(null);
      } catch (err) {
        console.error("Failed to fetch folder data:", err);
        setError("Failed to load folder information");
      } finally {
        setLoading(false);
      }
    };

    if (folderId) {
      fetchFolderAndDocuments();
    }
  }, [folderId]);

  const handleInvite = async (e) => {
    e.preventDefault();

    try {
      setInviteStatus({ loading: true });

      const requestData = {
        email,
        permission,
      };

      // Add selected files if user is sharing selective files
      if (shareOption === "selective" && selectedDocuments.length > 0) {
        requestData.selectedFiles = selectedDocuments;
      }

      await api.post(`/api/folders/${folderId}/collaborators`, requestData);

      // Refresh collaborators list
      const { data } = await api.get(`/api/folders/${folderId}/collaborators`);
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

  const handleDocumentSelect = (docId) => {
    setSelectedDocuments((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const handleFolderExpand = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Function to toggle selection of an entire folder
  const handleSelectFolder = (folderNode) => {
    const documentIds = [];

    // Helper function to collect all document IDs from a folder tree
    const collectDocumentIds = (node) => {
      // Add direct documents
      node.documents.forEach((doc) => documentIds.push(doc._id));

      // Recursively process subfolders
      node.subfolders.forEach((subfolder) => collectDocumentIds(subfolder));
    };

    collectDocumentIds(folderNode);

    // Check if all documents in this folder are already selected
    const allSelected = documentIds.every((id) =>
      selectedDocuments.includes(id)
    );

    if (allSelected) {
      // Deselect all documents in this folder
      setSelectedDocuments((prev) =>
        prev.filter((id) => !documentIds.includes(id))
      );
    } else {
      // Select all documents in this folder
      setSelectedDocuments((prev) => {
        const newSelected = [...prev];
        documentIds.forEach((id) => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  };

  // Recursive function to render the folder tree
  const renderFolderTree = (node) => {
    if (!node) return null;

    const isExpanded = expandedFolders[node._id];

    // Count how many documents in this folder and subfolders are selected
    let documentCount = 0;
    let selectedCount = 0;

    const countDocuments = (folderNode) => {
      documentCount += folderNode.documents.length;
      folderNode.documents.forEach((doc) => {
        if (selectedDocuments.includes(doc._id)) {
          selectedCount++;
        }
      });

      folderNode.subfolders.forEach((subfolder) => countDocuments(subfolder));
    };

    countDocuments(node);

    // Determine if the folder has any content (documents or subfolders)
    const hasContent = node.documents.length > 0 || node.subfolders.length > 0;

    const isFolderSelected =
      documentCount > 0 && documentCount === selectedCount;
    const isFolderPartiallySelected =
      selectedCount > 0 && selectedCount < documentCount;

    return (
      <div key={node._id} className="select-none">
        <div className="flex items-center py-1 hover:bg-slate-700 rounded">
          {/* Always show arrow space for consistent indentation */}
          <span
            className={`w-5 mr-1 text-slate-400 flex items-center justify-center ${
              hasContent ? "cursor-pointer" : ""
            }`}
            onClick={() => hasContent && handleFolderExpand(node._id)}
          >
            {hasContent &&
              (isExpanded ? (
                <FiChevronDown size={14} />
              ) : (
                <FiChevronRight size={14} />
              ))}
          </span>

          <div
            className="flex items-center cursor-pointer flex-grow"
            onClick={() => handleSelectFolder(node)}
          >
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600 rounded mr-2"
              checked={isFolderSelected}
              onChange={() => {}}
              ref={(el) => {
                if (el) {
                  el.indeterminate = isFolderPartiallySelected;
                }
              }}
            />
            <span className="mr-1.5 text-purple-400">
              <FiFolder size={14} />
            </span>
            <span className="text-slate-200 text-sm truncate">{node.name}</span>
            <span className="ml-2 text-xs text-slate-400">
              {documentCount > 0 && `(${documentCount})`}
            </span>
          </div>
        </div>

        {/* Only render expanded content if there is any */}
        {isExpanded && hasContent && (
          <div className="pl-5 border-l border-slate-700/30 ml-2 mt-1">
            {/* Render documents in this folder */}
            {node.documents.map((doc) => (
              <div
                key={doc._id}
                className="flex items-center py-1 hover:bg-slate-700 rounded pl-1"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600 rounded mr-2"
                  checked={selectedDocuments.includes(doc._id)}
                  onChange={() => handleDocumentSelect(doc._id)}
                />
                <span className="mr-1.5 text-slate-400">
                  <FiFile size={14} />
                </span>
                <span className="text-slate-200 text-sm truncate">
                  {doc.title}
                </span>
              </div>
            ))}

            {/* Render subfolders */}
            {node.subfolders.map((subfolder) => renderFolderTree(subfolder))}
          </div>
        )}
      </div>
    );
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
              Sharing this project will give collaborators access to files based
              on your selection. You can share the entire project or select
              specific files.
            </p>
          </div>

          <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
            <FiUserPlus className="text-blue-400" /> Invite Collaborators
          </h4>

          {/* Share Options */}
          <div className="mb-4">
            <p className="text-sm text-slate-300 mb-2">
              What do you want to share?
            </p>
            <div className="flex gap-3 mb-4">
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm ${
                  shareOption === "entire"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
                onClick={() => setShareOption("entire")}
              >
                Entire Project
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm ${
                  shareOption === "selective"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
                onClick={() => setShareOption("selective")}
              >
                Select Files
              </button>
            </div>

            {/* File Tree Selection */}
            {shareOption === "selective" && (
              <div className="border border-slate-600 rounded-md mb-4 max-h-60 overflow-y-auto">
                <div className="p-2">
                  {folderTree ? (
                    renderFolderTree(folderTree)
                  ) : (
                    <p className="text-slate-400 text-sm p-2">
                      No files in this project
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

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
              disabled={
                inviteStatus?.loading ||
                (shareOption === "selective" && selectedDocuments.length === 0)
              }
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
