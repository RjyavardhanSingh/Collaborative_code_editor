import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthProvider";
import {
  FiFolder,
  FiFile,
  FiFolderPlus,
  FiChevronRight,
  FiChevronDown,
  FiTrash2,
  FiEdit2,
  FiRefreshCw,
  FiCode,
} from "react-icons/fi";
import {
  SiJavascript,
  SiTypescript,
  SiHtml5,
  SiCss3,
  SiPython,
  SiC,
  SiCplusplus,
  SiRuby,
  SiPhp,
  SiGo,
  SiRust,
  SiJson,
  SiMarkdown,
  // SiCsharp is not available, removed it
} from "react-icons/si";
import { DiJava } from "react-icons/di";
import api from "../../lib/api";
import FolderCreateDialog from "../folders/FolderCreateDialog";
import FolderSharingDialog from "../folders/FolderSharingDialog";

export default function FileExplorer({
  onFileSelect,
  onFolderSelect,
  className,
  sharedOnly = false,
  currentFolderId = null,
  showAllFiles = false,
  currentDocumentId = null,
  filesOnly = false,
  foldersOnly = false,
  showFolderOptions = false,
  hideHeader = false,
  excludeGlobalFiles = false,
  showNestedFiles = false, // Add this new prop
}) {
  const { currentuser } = useAuth();
  const [folderTree, setFolderTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [currentParentFolder, setCurrentParentFolder] = useState(null);
  const [activeMenu, setActiveMenu] = useState({
    id: null,
    type: null,
    item: null,
  });

  // Add state for folder renaming
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");

  // Add state for folder sharing
  const [showFolderSharing, setShowFolderSharing] = useState(false);
  const [sharingFolderId, setSharingFolderId] = useState(null);

  // Modified fetchFolderStructure to support filtering for files or folders only
  const fetchFolderStructure = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch folders with error handling
      let folders = [];
      try {
        const foldersResponse = await api.get("/api/folders");
        folders = foldersResponse.data || [];
      } catch (folderErr) {
        console.warn("Could not fetch folders:", folderErr);
        // Continue with empty folders array
      }

      // Fetch documents with error handling
      let documents = [];
      try {
        const documentsResponse = await api.get("/api/documents");
        documents = documentsResponse.data || [];
      } catch (docErr) {
        console.error("Could not fetch documents:", docErr);
        // Continue with empty documents array
      }

      // If both requests failed, show error
      if (folders.length === 0 && documents.length === 0) {
        setError(
          "Failed to load folders and files. Server may be unavailable."
        );
        setFolderTree([]);
        setLoading(false);
        return;
      }

      // Continue with the data we have - filter documents if needed
      let filteredDocuments = documents;
      if (sharedOnly && currentuser) {
        filteredDocuments = documents.filter(
          (doc) =>
            doc.owner?._id !== currentuser?._id &&
            doc.collaborators?.some((c) => c.user === currentuser?._id)
        );
      }

      // If a specific folder is selected and we're not showing all files
      if (currentFolderId && !showAllFiles) {
        // Convert IDs to strings for reliable comparison
        filteredDocuments = documents.filter(
          (doc) => doc.folder?.toString() === currentFolderId?.toString()
        );
      } else if (currentFolderId && showNestedFiles) {
        // If showNestedFiles is true, collect files from all subfolders
        // Get all subfolder IDs recursively
        const allSubfolderIds = getAllSubfolderIds(folders, currentFolderId);

        // Include files from current folder and all subfolders
        filteredDocuments = documents.filter(
          (doc) =>
            doc.folder?.toString() === currentFolderId?.toString() ||
            allSubfolderIds.includes(doc.folder?.toString())
        );
      }

      // Apply filesOnly or foldersOnly filters if specified
      let finalTree;
      if (filesOnly) {
        // Only create a tree with files, no folders
        finalTree = filteredDocuments.map((doc) => ({
          ...doc,
          type: "document",
        }));
      } else if (foldersOnly) {
        // Only create a tree with folders, no files
        finalTree = buildFolderTree(
          folders,
          [],
          currentFolderId,
          showAllFiles,
          true
        );
      } else {
        // Build the normal combined tree
        finalTree = buildFolderTree(
          folders,
          filteredDocuments,
          currentFolderId,
          showAllFiles,
          !filesOnly // Exclude global files when showing folders
        );
      }

      setFolderTree(finalTree);
      setError(null);

      // Auto-expand the current folder
      if (currentFolderId) {
        setExpandedFolders((prev) => ({ ...prev, [currentFolderId]: true }));
      }
    } catch (err) {
      console.error("Failed to process folder structure:", err);
      setError("Failed to organize folders and files");
      setFolderTree([]);
    } finally {
      setLoading(false);
    }
  };

  // Add this new useEffect to handle clicks outside the menu
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // If we have an active menu and clicked outside any menu button or menu
      if (activeMenu.id && !e.target.closest(".menu-trigger, .context-menu")) {
        setActiveMenu({ id: null, type: null, item: null });
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeMenu.id]);

  // Replace existing fetchFolderStructure useEffect with this
  useEffect(() => {
    fetchFolderStructure();
  }, [currentFolderId, showAllFiles, currentDocumentId]);

  // Build a tree structure of folders and files
  const buildFolderTree = (
    folders,
    documents,
    currentFolderId,
    showAllFiles,
    excludeGlobalFiles = false // Add this parameter
  ) => {
    // Create a map of all folders by ID for quick lookup
    const folderMap = new Map();
    folders.forEach((folder) => {
      folderMap.set(folder._id, {
        ...folder,
        type: "folder",
        children: [],
      });
    });

    if (currentFolderId && !showAllFiles) {
      // Find the specific folder and its children
      let currentFolder = folderMap.get(currentFolderId);
      if (!currentFolder) return [];

      // Get all child folders recursively
      const getChildFolders = (folderId) => {
        const children = Array.from(folderMap.values())
          .filter((folder) => folder.parentFolder === folderId)
          .map((folder) => {
            folder.children = getChildFolders(folder._id);
            return folder;
          });

        // Get documents for this folder level
        const folderDocuments = documents
          .filter((doc) => doc.folder?.toString() === folderId?.toString())
          .map((doc) => ({ ...doc, type: "document" }));

        return [...children, ...folderDocuments];
      };

      currentFolder.children = getChildFolders(currentFolderId);

      // If showNestedFiles is true, get all documents from all nested folders and add them directly
      // to the current folder for easy access
      if (showNestedFiles) {
        const getAllNestedDocuments = (folders, documents, folderId) => {
          const nestedDocs = [];

          const processFolder = (id) => {
            // Add documents directly in this folder
            const folderDocs = documents
              .filter((doc) => doc.folder?.toString() === id?.toString())
              .map((doc) => ({ ...doc, type: "document" }));

            nestedDocs.push(...folderDocs);

            // Find and process child folders
            const childFolders = folders.filter(
              (folder) => folder.parentFolder?.toString() === id?.toString()
            );

            childFolders.forEach((child) => processFolder(child._id));
          };

          // Start with the parent folder
          processFolder(folderId);
          return nestedDocs;
        };

        // Add all nested documents to current folder
        const allNestedDocs = getAllNestedDocuments(
          folders,
          documents,
          currentFolderId
        );
        currentFolder.allNestedDocuments = allNestedDocs;
      }

      return [currentFolder];
    } else {
      // Show the full hierarchy (or root level)
      const rootFolders = folders
        .filter(
          (folder) => folder.parentFolder === null || !folder.parentFolder
        )
        .map((folder) => folderMap.get(folder._id));

      // Organize folders into a tree
      folders.forEach((folder) => {
        if (folder.parentFolder && folderMap.has(folder.parentFolder)) {
          const parent = folderMap.get(folder.parentFolder);
          parent.children.push(folderMap.get(folder._id));
        }
      });

      // Add documents to their respective folders or root level
      documents.forEach((doc) => {
        const documentItem = { ...doc, type: "document" };

        // More robust check if a document has a valid folder
        const hasValidFolder =
          doc.folder &&
          doc.folder !== "" &&
          !(
            typeof doc.folder === "object" &&
            Object.keys(doc.folder).length === 0
          );

        if (hasValidFolder) {
          const folderIdStr =
            typeof doc.folder === "object" ? doc.folder.toString() : doc.folder;

          // Find the folder in our map using string comparison
          let found = false;
          folderMap.forEach((folder, key) => {
            if (key.toString() === folderIdStr) {
              folder.children.push(documentItem);
              found = true;
            }
          });

          // If no folder found and we're not folders-only, add to root
          if (!found && !foldersOnly && !excludeGlobalFiles) {
            rootFolders.push(documentItem);
          }
        } else if (!foldersOnly && !excludeGlobalFiles) {
          // Only add true global documents (no folder) to root
          rootFolders.push(documentItem);
        }
      });

      return rootFolders;
    }
  };

  // Update the handleNewFolder function to properly handle folder creation

  const handleNewFolder = async (parentId = null) => {
    console.log("Creating new folder with parent ID:", parentId);
    setCurrentParentFolder(parentId);
    setShowCreateFolder(true);
  };

  const handleCreateFolder = async (name) => {
    try {
      await api.post("/api/folders", {
        name,
        parentFolder: currentParentFolder,
      });

      fetchFolderStructure();
      setShowCreateFolder(false);
    } catch (err) {
      console.error("Failed to create folder:", err);
      setError("Failed to create folder");
    }
  };

  const handleCloseContextMenu = () => {
    setActiveMenu({ id: null, type: null, item: null });
  };

  // Add folder delete function
  const handleDeleteFolder = async (folderId) => {
    try {
      await api.delete(`/api/folders/${folderId}`);
      fetchFolderStructure();
    } catch (err) {
      console.error("Failed to delete folder:", err);
      setError("Failed to delete folder");
    }
  };

  // Helper function to determine language from file extension
  const getLanguageFromExtension = (ext) => {
    const extensionMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      py: "python",
      java: "java",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
    };
    return extensionMap[ext] || "plaintext";
  };

  // Helper function to provide default content for new files
  const getDefaultContentForLanguage = (lang) => {
    switch (lang) {
      case "javascript":
        return "// JavaScript code\nconsole.log('Hello, world!');\n";
      case "html":
        return "<!DOCTYPE html>\n<html>\n<head>\n  <title>New Document</title>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n</body>\n</html>";
      case "css":
        return "/* CSS styles */\nbody {\n  font-family: sans-serif;\n}\n";
      case "python":
        return "# Python script\ndef main():\n    print('Hello, world!')\n\nif __name__ == '__main__':\n    main()";
      case "typescript":
        return "// TypeScript code\ninterface Person {\n    name: string;\n    age: number;\n}\n\nconst greeting = (person: Person): string => {\n    return `Hello, ${person.name}!`;\n};\n\nconsole.log(greeting({ name: 'World', age: 0 }));";
      default:
        return "";
    }
  };

  // Updated handleCreateDocument function to ensure subfolder IDs are properly handled

  const handleCreateDocument = async (folderId = null) => {
    try {
      const filename = prompt(
        "Enter filename with extension (e.g. main.js, index.html)"
      );
      if (!filename) return;

      const extension = filename.split(".").pop().toLowerCase();
      const language = getLanguageFromExtension(extension);
      const content = getDefaultContentForLanguage(language);

      // Use the explicitly passed folder ID directly, don't modify it
      // This ensures the correct folder context is maintained
      console.log("Creating file in folder:", folderId || currentFolderId);

      const response = await api.post("/api/documents", {
        title: filename,
        content,
        language,
        folder: folderId || currentFolderId, // Keep the folder ID as is
      });

      console.log("File created response:", response.data);

      // Refresh folder structure before navigating
      await fetchFolderStructure();

      // If onFileSelect is defined, navigate to the new file
      if (onFileSelect && response.data && response.data._id) {
        onFileSelect(response.data);
      }
    } catch (error) {
      console.error("Error creating document:", error);
      setError("Failed to create document");
    }
  };

  // Toggle folder expansion
  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Add rename folder functionality
  const handleRenameFolder = async (folderId, newName) => {
    try {
      await api.put(`/api/folders/${folderId}`, {
        name: newName,
      });

      fetchFolderStructure();
      setIsRenaming(false);
      setRenamingFolderId(null);
      setNewFolderName("");
    } catch (err) {
      console.error("Failed to rename folder:", err);
      setError("Failed to rename folder");
    }
  };

  // Add this function before the renderTreeItems function

  const getFileIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();

    switch (extension) {
      case "js":
        return <SiJavascript className="text-yellow-400" size={14} />;
      case "jsx":
        return <SiJavascript className="text-yellow-400" size={14} />;
      case "ts":
        return <SiTypescript className="text-blue-400" size={14} />;
      case "tsx":
        return <SiTypescript className="text-blue-400" size={14} />;
      case "html":
        return <SiHtml5 className="text-orange-500" size={14} />;
      case "css":
        return <SiCss3 className="text-blue-500" size={14} />;
      case "py":
        return <SiPython className="text-blue-500" size={14} />;
      case "java":
        return <DiJava className="text-red-500" size={14} />;
      case "cpp":
      case "cc":
      case "cxx":
        return <SiCplusplus className="text-blue-600" size={14} />;
      case "cs":
        // Use a text label since SiCsharp isn't available
        return (
          <span className="bg-purple-800 text-xs px-1 rounded text-white">
            C#
          </span>
        );
      case "c":
        return <SiC className="text-blue-600" size={14} />;
      case "md":
      case "markdown":
        return <SiMarkdown className="text-white" size={14} />;
      case "json":
        return <SiJson className="text-yellow-300" size={14} />;
      case "rb":
        return <SiRuby className="text-red-600" size={14} />;
      case "php":
        return <SiPhp className="text-purple-400" size={14} />;
      case "go":
        return <SiGo className="text-blue-400" size={14} />;
      case "rs":
        return <SiRust className="text-orange-600" size={14} />;
      default:
        return <FiFile size={14} />;
    }
  };

  // Replace the renderTreeItems function with this version
  const renderTreeItems = (items) => {
    return items
      .map((item) => {
        if (item.type === "folder") {
          const isExpanded = expandedFolders[item._id];
          const isCurrentlyRenaming =
            renamingFolderId === item._id && isRenaming;

          return (
            <div key={item._id} className="select-none">
              <div className="flex items-center justify-between py-1 px-2 hover:bg-slate-700/50 rounded">
                <div
                  className={`flex items-center cursor-pointer flex-grow ${
                    currentFolderId === item._id ? "bg-slate-700/70" : ""
                  }`}
                  onClick={() => toggleFolder(item._id)}
                >
                  <span className="mr-1 text-slate-400">
                    {isExpanded ? (
                      <FiChevronDown size={14} />
                    ) : (
                      <FiChevronRight size={14} />
                    )}
                  </span>
                  <span className="mr-1.5 text-purple-400">
                    <FiFolder size={14} />
                  </span>

                  {isCurrentlyRenaming ? (
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onBlur={() => {
                        if (newFolderName.trim()) {
                          handleRenameFolder(item._id, newFolderName);
                        } else {
                          setIsRenaming(false);
                          setRenamingFolderId(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newFolderName.trim()) {
                          handleRenameFolder(item._id, newFolderName);
                        } else if (e.key === "Escape") {
                          setIsRenaming(false);
                          setRenamingFolderId(null);
                        }
                      }}
                      className="bg-slate-700 text-white text-sm p-0.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span className="text-slate-200 text-sm truncate">
                      {item.name}
                    </span>
                  )}
                </div>

                {!isCurrentlyRenaming && (
                  <div className="flex items-center ml-auto">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onFolderSelect) {
                          onFolderSelect(item);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-blue-400 rounded"
                      title="Open in Editor"
                    >
                      <FiFolder size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Create file directly in this folder
                        handleCreateDocument(item._id);
                      }}
                      className="p-1 text-slate-400 hover:text-green-400 rounded"
                      title="New File"
                    >
                      <FiFile size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Create subfolder directly in this folder
                        handleNewFolder(item._id);
                      }}
                      className="p-1 text-slate-400 hover:text-purple-400 rounded"
                      title="New Subfolder"
                    >
                      <FiFolderPlus size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsRenaming(true);
                        setRenamingFolderId(item._id);
                        setNewFolderName(item.name);
                      }}
                      className="p-1 text-slate-400 hover:text-yellow-400 rounded"
                      title="Rename"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Are you sure you want to delete the folder "${item.name}"?`
                          )
                        ) {
                          handleDeleteFolder(item._id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-400 rounded"
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {isExpanded && item.children && item.children.length > 0 && (
                <div className="pl-4 border-l border-slate-700/50 ml-2.5">
                  {renderTreeItems(item.children)}
                </div>
              )}

              {/* If this is the current folder and showNestedFiles is true, add a section for all nested files */}
              {showNestedFiles &&
                item._id === currentFolderId &&
                item.allNestedDocuments?.length > 0 && (
                  <div className="pl-4 border-l border-slate-700/50 ml-2.5">
                    <div className="py-1 px-2">
                      <span className="text-slate-400 text-xs font-medium">
                        All Nested Files
                      </span>
                    </div>
                    <div className="pl-2">
                      {item.allNestedDocuments.map((doc) => (
                        <div
                          key={doc._id}
                          className={`flex items-center py-1 px-2 hover:bg-slate-700/50 rounded cursor-pointer ${
                            currentDocumentId === doc._id
                              ? "bg-blue-500/20 text-blue-400"
                              : ""
                          }`}
                          onClick={() => onFileSelect(doc)}
                        >
                          <span className="mr-1.5 text-slate-400 flex items-center justify-center">
                            {getFileIcon(doc.title)}
                          </span>
                          <span className="text-slate-200 text-sm truncate">
                            {doc.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          );
        } else if (!foldersOnly) {
          // Only render document items if not in foldersOnly mode
          return (
            <div
              key={item._id}
              className={`flex items-center py-1 px-2 hover:bg-slate-700/50 rounded cursor-pointer ${
                currentDocumentId === item._id
                  ? "bg-blue-500/20 text-blue-400"
                  : ""
              }`}
              onClick={() => onFileSelect(item)}
            >
              <span className="mr-1.5 text-slate-400 flex items-center justify-center">
                {getFileIcon(item.title)}
              </span>
              <span className="text-slate-200 text-sm truncate">
                {item.title}
              </span>
            </div>
          );
        }

        return null; // For TypeScript safety
      })
      .filter(Boolean); // Filter out null items
  };

  // Add handleFolderAction for the folder context menu
  const handleFolderAction = (action, folder) => {
    switch (action) {
      case "open":
        if (onFolderSelect) {
          onFolderSelect(folder);
        }
        break;
      case "rename":
        setIsRenaming(true);
        setRenamingFolderId(folder._id);
        setNewFolderName(folder.name);
        break;
      case "delete":
        if (
          window.confirm(
            `Are you sure you want to delete the folder "${folder.name}"?`
          )
        ) {
          handleDeleteFolder(folder._id);
        }
        break;
      default:
        console.log(
          `Action ${action} not implemented for folder ${folder.name}`
        );
    }

    handleCloseContextMenu();
  };

  // Update the context menu render to include folder options
  const renderContextMenu = () => {
    if (!activeMenu.id) return null;

    if (activeMenu.type === "folder") {
      return (
        <div
          className="fixed bg-slate-800 shadow-xl rounded border border-slate-700 py-1 z-50"
          style={{ top: activeMenu.y, left: activeMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
            onClick={() => handleFolderAction("open", activeMenu.item)}
          >
            <FiFolder size={14} className="text-purple-400" />
            Open in Editor
          </button>

          <button
            className="w-full text-left px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
            onClick={() => handleFolderAction("rename", activeMenu.item)}
          >
            <FiEdit2 size={14} className="text-blue-400" />
            Rename
          </button>

          <hr className="border-slate-700 my-1" />

          <button
            className="w-full text-left px-4 py-1.5 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
            onClick={() => handleFolderAction("delete", activeMenu.item)}
          >
            <FiTrash2 size={14} />
            Delete Folder
          </button>
        </div>
      );
    }

    // Keep existing document context menu
    if (activeMenu.type === "document") {
      return (
        <div
          className="fixed bg-slate-800 shadow-xl rounded border border-slate-700 py-1 z-50"
          style={{ top: activeMenu.y, left: activeMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
            onClick={() => {
              onFileSelect(activeMenu.item);
              handleCloseContextMenu();
            }}
          >
            <FiEdit2 size={14} className="text-blue-400" />
            Open
          </button>
          <hr className="border-slate-700 my-1" />
          <button
            className="w-full text-left px-4 py-1.5 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
            onClick={() => {
              // Add document deletion logic here
              handleCloseContextMenu();
            }}
          >
            <FiTrash2 size={14} />
            Delete
          </button>
        </div>
      );
    }

    return null;
  };

  // Update the return statement to use the renderContextMenu function
  return (
    <div className={`h-full flex flex-col ${className || ""}`}>
      {!hideHeader && !foldersOnly && !filesOnly && (
        <div className="flex-none p-2 border-b border-slate-700/50 flex justify-between items-center">
          <h3 className="text-white font-medium flex items-center gap-1.5">
            <FiFolder className="text-blue-400" size={16} /> Explorer
          </h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleCreateDocument(currentFolderId)}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="New File"
            >
              <FiFile size={16} />
            </button>
            <button
              onClick={() => handleNewFolder(currentFolderId)}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="New Folder"
            >
              <FiFolderPlus size={16} />
            </button>
            <button
              onClick={() => fetchFolderStructure()}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Refresh"
            >
              <FiRefreshCw size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <FiRefreshCw className="animate-spin text-blue-400 mr-2" />
            <span className="text-slate-300 text-sm">Loading...</span>
          </div>
        ) : error ? (
          <div className="text-center p-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchFolderStructure}
              className="mt-2 px-3 py-1 bg-slate-700 text-sm text-slate-300 rounded hover:bg-slate-600"
            >
              Retry
            </button>
          </div>
        ) : folderTree.length > 0 ? (
          renderTreeItems(folderTree)
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">
              {filesOnly
                ? "No files found"
                : foldersOnly
                ? "No folders found"
                : "No files or folders yet"}
            </p>
            {!filesOnly && (
              <button
                onClick={() => handleNewFolder(null)}
                className="mt-2 px-3 py-1 bg-slate-700 text-sm text-blue-400 rounded hover:bg-slate-600 flex items-center gap-1 mx-auto"
              >
                <FiFolderPlus size={14} /> Create folder
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      {showCreateFolder && (
        <FolderCreateDialog
          onClose={() => setShowCreateFolder(false)}
          onCreateFolder={handleCreateFolder}
          parentFolderId={currentParentFolder}
        />
      )}

      {/* Share Folder Dialog */}
      {showFolderSharing && (
        <FolderSharingDialog
          folderId={sharingFolderId}
          onClose={() => {
            setShowFolderSharing(false);
            setSharingFolderId(null);
          }}
        />
      )}
    </div>
  );
}
