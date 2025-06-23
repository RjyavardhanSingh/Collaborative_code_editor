import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthProvider"; // Add this import
import {
  FiFolder,
  FiFile,
  FiFolderPlus,
  FiChevronRight,
  FiChevronDown,
  FiPlusCircle,
  FiMoreVertical,
  FiTrash2,
  FiEdit2,
  FiRefreshCw,
} from "react-icons/fi";
import api from "../../lib/api";
import FolderCreateDialog from "../folders/FolderCreateDialog";

export default function FileExplorer({
  onFileSelect,
  className,
  sharedOnly = false,
}) {
  const { currentuser } = useAuth(); // Add this line to get the current user
  const [folderTree, setFolderTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [currentParentFolder, setCurrentParentFolder] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    item: null,
  });

  // Fetch folder structure
  const fetchFolderStructure = async () => {
    try {
      setLoading(true);
      // These should match your backend routes
      const { data: folders } = await api.get("/api/folders");
      const { data: documents } = await api.get("/api/documents");

      // Add a null check for currentuser before filtering
      const filteredDocuments =
        sharedOnly && currentuser
          ? documents.filter(
              (doc) =>
                doc.owner?._id !== currentuser._id &&
                doc.collaborators?.some((c) => c.user === currentuser._id)
            )
          : documents;

      // Build tree structure
      const tree = buildFolderTree(folders, filteredDocuments);
      setFolderTree(tree);
      setError(null);
    } catch (err) {
      console.error("Failed to load file structure", err);
      setError("Failed to load folders and files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderStructure();
  }, []);

  // Build a tree structure of folders and files
  const buildFolderTree = (folders, documents) => {
    // First, create a map of all folders by ID for easy lookup
    const folderMap = new Map();
    folders.forEach((folder) => {
      folderMap.set(folder._id, {
        ...folder,
        type: "folder",
        children: [],
      });
    });

    // Root folders (no parent)
    const rootFolders = folders.filter((folder) => !folder.parentFolder);

    // Add subfolders to their parent folders
    folders.forEach((folder) => {
      if (folder.parentFolder && folderMap.has(folder.parentFolder)) {
        const parentFolder = folderMap.get(folder.parentFolder);
        parentFolder.children.push(folderMap.get(folder._id));
      }
    });

    // Add documents to their respective folders or to root
    documents.forEach((doc) => {
      const docItem = { ...doc, type: "file" };
      if (doc.folderId && folderMap.has(doc.folderId)) {
        folderMap.get(doc.folderId).children.push(docItem);
      } else {
        // This is a root-level document
        rootFolders.push(docItem);
      }
    });

    return rootFolders.map((folder) => {
      if (folder.type === "folder") {
        return folderMap.get(folder._id);
      }
      return folder;
    });
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      type,
      item,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: null,
      item: null,
    });
  };

  const handleNewFolder = (parentId = null) => {
    setCurrentParentFolder(parentId);
    setShowCreateFolder(true);
    closeContextMenu();
  };

  const handleFolderCreated = (newFolder) => {
    fetchFolderStructure();
  };

  const handleDeleteItem = async (item, type) => {
    try {
      if (type === "folder") {
        await api.delete(`/api/folders/${item._id}`);
      } else {
        await api.delete(`/api/documents/${item._id}`);
      }
      fetchFolderStructure();
    } catch (err) {
      console.error(`Failed to delete ${type}`, err);
      alert(err.response?.data?.message || `Failed to delete ${type}`);
    }
    closeContextMenu();
  };

  const handleFileClick = (file) => {
    onFileSelect(file);
  };

  // Render tree items recursively
  const renderTreeItems = (items) => {
    if (!items || items.length === 0) return null;

    return items.map((item) => {
      if (item.type === "folder") {
        const isExpanded = expandedFolders[item._id];
        return (
          <div key={item._id}>
            <div
              className="flex items-center py-1 px-2 hover:bg-slate-700/50 cursor-pointer rounded"
              onClick={() => toggleFolder(item._id)}
              onContextMenu={(e) => handleContextMenu(e, item, "folder")}
            >
              <span className="mr-1 text-slate-400">
                {isExpanded ? (
                  <FiChevronDown size={16} />
                ) : (
                  <FiChevronRight size={16} />
                )}
              </span>
              <FiFolder
                className={`mr-2 ${
                  isExpanded ? "text-blue-400" : "text-slate-400"
                }`}
              />
              <span className="text-slate-300 text-sm truncate">
                {item.name}
              </span>
            </div>

            {isExpanded && item.children?.length > 0 && (
              <div className="ml-4">{renderTreeItems(item.children)}</div>
            )}
          </div>
        );
      } else {
        // File item
        return (
          <div
            key={item._id}
            className="flex items-center py-1 pl-6 pr-2 hover:bg-slate-700/50 cursor-pointer rounded"
            onClick={() => handleFileClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item, "file")}
          >
            {getFileIcon(item.language)}
            <span className="text-slate-300 text-sm truncate">
              {item.title}
            </span>
          </div>
        );
      }
    });
  };

  const getFileIcon = (language) => {
    switch (language?.toLowerCase()) {
      case "javascript":
        return <span className="text-yellow-500 mr-2">JS</span>;
      case "typescript":
        return <span className="text-blue-500 mr-2">TS</span>;
      case "html":
        return <span className="text-orange-500 mr-2">HTML</span>;
      case "css":
        return <span className="text-blue-400 mr-2">CSS</span>;
      case "python":
        return <span className="text-green-500 mr-2">PY</span>;
      default:
        return <FiFile className="mr-2 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <FiRefreshCw className="animate-spin text-blue-400 mr-2" />
        <span className="text-slate-300">Loading files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-red-400">
        <p className="mb-4">{error}</p>
        <button
          onClick={fetchFolderStructure}
          className="flex items-center px-3 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600"
        >
          <FiRefreshCw className="mr-1" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className || ""}`}>
      <div className="p-2 flex justify-between items-center border-b border-slate-700/50">
        <h3 className="text-white font-medium">Explorer</h3>
        <button
          onClick={() => handleNewFolder(null)}
          className="text-slate-400 hover:text-white"
          title="New Folder"
        >
          <FiFolderPlus />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {folderTree.length > 0 ? (
          renderTreeItems(folderTree)
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>No files or folders yet</p>
            <button
              onClick={() => handleNewFolder(null)}
              className="mt-2 text-blue-400 flex items-center mx-auto"
            >
              <FiFolderPlus className="mr-1" /> Create a folder
            </button>
          </div>
        )}
      </div>

      {contextMenu.visible && (
        <div
          className="fixed bg-slate-800 border border-slate-700 rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={closeContextMenu}
        >
          {contextMenu.type === "folder" && (
            <button
              className="block w-full text-left px-4 py-1 text-sm text-slate-300 hover:bg-slate-700"
              onClick={() => handleNewFolder(contextMenu.item._id)}
            >
              <FiFolderPlus className="inline mr-2" /> New Folder
            </button>
          )}
          <button
            className="block w-full text-left px-4 py-1 text-sm text-slate-300 hover:bg-slate-700"
            onClick={() => {
              /* Edit functionality would go here */
              closeContextMenu();
            }}
          >
            <FiEdit2 className="inline mr-2" /> Rename
          </button>
          <button
            className="block w-full text-left px-4 py-1 text-sm text-red-400 hover:bg-slate-700"
            onClick={() => handleDeleteItem(contextMenu.item, contextMenu.type)}
          >
            <FiTrash2 className="inline mr-2" /> Delete
          </button>
        </div>
      )}

      {showCreateFolder && (
        <FolderCreateDialog
          onClose={() => setShowCreateFolder(false)}
          onFolderCreated={handleFolderCreated}
          parentFolder={currentParentFolder}
        />
      )}
    </div>
  );
}
