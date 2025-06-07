import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { motion } from "framer-motion";
import {
  FiPlus,
  FiSearch,
  FiStar,
  FiFolder,
  FiUsers,
  FiGrid,
  FiActivity,
  FiEdit,
  FiEye,
  FiCode,
  FiFile,
} from "react-icons/fi";
import api from "../../lib/api.js";
import Navbar from "../../components/layout/NavBar";

export default function Dashboard() {
  const { currentuser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    ownedDocuments: [],
    sharedDocuments: [],
    pinnedDocuments: [],
    activityStats: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const documentResponse = await api.get(
          `/api/users/${currentuser._id}/documents`
        );
        const analyticsResponse = await api.get("/api/analytics/usage");
        const pinnedDocs = documentResponse.data.owned.slice(0, 2);

        setDashboardData({
          ownedDocuments: documentResponse.data.owned,
          sharedDocuments: documentResponse.data.shared,
          pinnedDocuments: pinnedDocs,
          activityStats: analyticsResponse.data,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentuser?._id) {
      fetchDashboardData();
    }
  }, [currentuser]);

  const handleCreateDocument = async (templateId) => {
    try {
      let language = "javascript";
      let content = "// New document\n";
      let title = "Untitled Document";

      const filename = prompt(
        "Enter filename with extension (e.g. main.js, index.html):",
        templateId ? getDefaultFilename(templateId) : "untitled.js"
      );

      if (!filename) return;

      const extension = filename.split(".").pop().toLowerCase();
      title = filename;

      language = getLanguageFromExtension(extension);

      if (templateId) {
        const template = getTemplateContent(templateId);
        content = template.content || content;
      } else {
        content = getDefaultContentForLanguage(language);
      }

      if (!content || content.trim() === "") {
        content = `// Default ${language} content\n`;
      }

      const documentData = {
        title,
        content,
        language,
        isPublic: false,
      };

      console.log("Sending document data:", documentData);

      const response = await api.post("/api/documents", documentData);
      navigate(`/documents/${response.data._id}`);
    } catch (error) {
      console.error("Error creating document:", error);
      if (error.response) {
        console.error("Server error response:", error.response.data);
        setError(
          `Failed to create document: ${
            error.response.data.message || "Unknown server error"
          }`
        );
      } else {
        setError(
          "Failed to create document. Network error or server is unreachable."
        );
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const hours = Math.floor(diffTime / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diffTime / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
      }
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} week${
        Math.floor(diffDays / 7) !== 1 ? "s" : ""
      } ago`;

    return date.toLocaleDateString();
  };

  const templates = [
    {
      id: "js",
      name: "JavaScript",
      description: "Basic JavaScript setup with ES6 syntax",
      icon: <FiCode />,
    },
    {
      id: "react",
      name: "React Component",
      description: "Functional React component with hooks",
      icon: <FiCode />,
    },
    {
      id: "html",
      name: "HTML5",
      description: "HTML5 document with CSS and JS links",
      icon: <FiFile />,
    },
    {
      id: "api",
      name: "API Spec",
      description: "API documentation template",
      icon: <FiGrid />,
    },
  ];

  const documentListItem = (doc, isPinned = false) => (
    <motion.div
      key={doc._id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <Link
              to={`/documents/${doc._id}`}
              className="text-blue-500 font-medium hover:text-blue-400 flex items-center gap-1"
            >
              <span>{doc.title}</span>
              {doc.isPublic && (
                <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">
                  Public
                </span>
              )}
            </Link>
            <div className="flex items-center mt-1 gap-2">
              <span className="text-xs font-medium text-slate-400">
                {doc.language}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-xs text-slate-500">
                Updated {formatDate(doc.updatedAt)}
              </span>
            </div>
          </div>
          <button
            className={`text-slate-400 hover:text-${
              isPinned ? "yellow" : "slate"
            }-300`}
            onClick={() =>
              console.log(`${isPinned ? "Unpin" : "Pin"} document ${doc._id}`)
            }
          >
            <FiStar
              className={isPinned ? "fill-yellow-400 text-yellow-400" : ""}
            />
          </button>
        </div>
      </div>
      <div className="bg-slate-900/50 py-2 px-4 flex justify-between items-center border-t border-slate-700">
        <div className="flex items-center gap-2">
          <button
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1"
            onClick={() => navigate(`/documents/${doc._id}`)}
          >
            <FiEdit className="text-slate-500" />
            Edit
          </button>
          <span className="text-slate-600">|</span>
          <button
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1"
            onClick={() => navigate(`/documents/${doc._id}/preview`)}
          >
            <FiEye className="text-slate-500" />
            Preview
          </button>
        </div>
        <button
          className="text-xs font-medium text-slate-400 hover:text-white"
          onClick={() => console.log(`Share document ${doc._id}`)}
        >
          <FiUsers />
        </button>
      </div>
    </motion.div>
  );

  const sharedDocumentListItem = (doc) => (
    <motion.div
      key={doc._id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <Link
              to={`/documents/${doc._id}`}
              className="text-blue-500 font-medium hover:text-blue-400"
            >
              {doc.title}
            </Link>
            <div className="flex items-center mt-1 gap-2">
              <span className="text-xs font-medium text-slate-400">
                {doc.language}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-xs text-slate-400">
                Owner: {doc.owner?.username || "Unknown"}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-xs text-slate-500">
                Updated {formatDate(doc.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/50 py-2 px-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <button
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1"
            onClick={() => navigate(`/documents/${doc._id}`)}
          >
            <FiEdit className="text-slate-500" />
            Open
          </button>
        </div>
      </div>
    </motion.div>
  );

  // Start rendering
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-300">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar
        title="Dashboard"
        actions={
          <>
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <FiSearch className="text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Search documents..."
                />
              </div>
            </div>
            <button
              onClick={handleCreateDocument}
              className="px-3 py-1.5 rounded-md text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-colors mr-4"
            >
              + New Document
            </button>
          </>
        }
      >
        <div className="ml-10 hidden md:flex items-baseline space-x-4">
          <Link
            to="/dashboard"
            className="px-3 py-2 rounded-md text-sm font-medium bg-slate-700 text-white"
          >
            Dashboard
          </Link>
          <Link
            to="/documents"
            className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Documents
          </Link>
          <Link
            to="/shared"
            className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Shared
          </Link>
        </div>
      </Navbar>

      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-lg shadow-lg overflow-hidden mb-8"
          >
            <div className="px-6 py-8 sm:p-10 sm:pb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Welcome back, {currentuser?.username}!
                </h2>
                <span className="inline-flex px-4 py-1 text-xs font-semibold leading-5 rounded-full bg-blue-800/30 text-blue-300">
                  Pro User
                </span>
              </div>
              <div className="mt-4 text-slate-300">
                <p>
                  Ready to continue coding? Your recent documents are available
                  below.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 sm:px-10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-4">
                  {dashboardData.activityStats && (
                    <>
                      <div>
                        <p className="text-sm text-slate-400">
                          Documents created
                        </p>
                        <p className="text-xl font-semibold text-white">
                          {dashboardData.activityStats.documentsCreated || 0}
                        </p>
                      </div>
                      <div className="border-l border-slate-700 pl-4">
                        <p className="text-sm text-slate-400">
                          Recent activity
                        </p>
                        <p className="text-xl font-semibold text-white">
                          {dashboardData.activityStats.recentActivity || 0}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Link
                  to="/analytics"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  View activity log
                </Link>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-slate-800 rounded-lg shadow overflow-hidden"
            >
              <div className="px-4 py-5 sm:px-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">
                    Your Recent Documents
                  </h3>
                  <Link
                    to="/documents"
                    className="text-sm text-blue-500 hover:text-blue-400"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-slate-700">
                {dashboardData.ownedDocuments.length > 0 ? (
                  dashboardData.ownedDocuments
                    .slice(0, 3)
                    .map((doc) => documentListItem(doc))
                ) : (
                  <div className="px-4 py-12 text-center">
                    <p className="text-slate-400">
                      You don't have any documents yet.
                    </p>
                    <button
                      onClick={handleCreateDocument}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Create your first document
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-slate-800 rounded-lg shadow overflow-hidden"
            >
              <div className="px-4 py-5 sm:px-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">
                    Shared With You
                  </h3>
                  <Link
                    to="/shared"
                    className="text-sm text-blue-500 hover:text-blue-400"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-slate-700">
                {dashboardData.sharedDocuments.length > 0 ? (
                  dashboardData.sharedDocuments
                    .slice(0, 3)
                    .map((doc) => sharedDocumentListItem(doc))
                ) : (
                  <div className="px-4 py-12 text-center text-slate-400">
                    <p>No documents have been shared with you yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg shadow overflow-hidden border border-blue-800/30"
          >
            <div className="px-6 py-5 sm:px-6 border-b border-blue-800/30">
              <h3 className="text-lg font-medium text-white">
                Quick Start Templates
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-slate-800/70 border border-slate-700 rounded-md p-4 hover:bg-slate-800 hover:border-slate-600 transition-colors cursor-pointer"
                    onClick={() => handleCreateDocument(template.id)}
                  >
                    <div className="h-10 w-10 rounded-md bg-blue-900/50 flex items-center justify-center text-blue-400 mb-3">
                      {template.icon}
                    </div>
                    <h4 className="text-white font-medium">{template.name}</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {template.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

const getLanguageFromExtension = (ext) => {
  const extensionMap = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    css: "css",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby",
    md: "markdown",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sql: "sql",
  };

  return extensionMap[ext] || "plaintext";
};

const getDefaultFilename = (templateId) => {
  switch (templateId) {
    case "js":
      return "script.js";
    case "react":
      return "Component.jsx";
    case "html":
      return "index.html";
    case "api":
      return "api-docs.md";
    default:
      return "untitled.js";
  }
};

const getDefaultContentForLanguage = (language) => {
  switch (language) {
    case "javascript":
      return '// JavaScript file\n\nconsole.log("Hello world!");\n';
    case "html":
      return "<!DOCTYPE html>\n<html>\n<head>\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>";
    case "python":
      return '# Python file\n\nprint("Hello world!")\n';
    case "markdown":
      return "# Document Title\n\n## Section\n\nContent goes here.\n";
    default:
      return "// New document\n";
  }
};

const getTemplateContent = (templateId) => {
  switch (templateId) {
    case "js":
      return {
        content: '// JavaScript Document\n\nconsole.log("Hello world!");\n',
      };
    case "react":
      return {
        content:
          'import React from "react";\n\nexport default function Component() {\n  return (\n    <div>\n      <h1>Hello React</h1>\n    </div>\n  );\n}\n',
      };
    case "html":
      return {
        content:
          '<!DOCTYPE html>\n<html>\n<head>\n  <title>Document</title>\n  <meta charset="UTF-8">\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>',
      };
    case "api":
      return {
        content:
          "# API Documentation\n\n## Endpoints\n\n### GET /api/resource\n\nReturns a list of resources.\n",
      };
    default:
      return {
        content: "",
      };
  }
};
