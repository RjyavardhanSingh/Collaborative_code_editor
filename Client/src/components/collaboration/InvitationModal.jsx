import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  FiX,
  FiMail,
  FiClock,
  FiLink,
  FiCopy,
  FiCheck,
  FiUsers,
} from "react-icons/fi";
import api from "../../lib/api.js";

export default function InvitationModal({ documentId, onClose }) {
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("read");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("email"); // "email" or "link"
  const [linkPermission, setLinkPermission] = useState("read");
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const linkInputRef = useRef(null);

  useEffect(() => {
    fetchInvitations();
  }, [documentId]);

  const generateSecureToken = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  };

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/users/invitations");
      const documentInvitations = Array.isArray(data)
        ? data.filter((invitation) => {
            const docId =
              invitation.document?._id || invitation.documentId?._id;
            return docId === documentId;
          })
        : [];

      setSentInvitations(documentInvitations);
    } catch (err) {
      console.error("Error loading invitations:", err);
      setError(err.response?.data?.message || "Failed to load invitations");
      setSentInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Email is required");
      return;
    }

    try {
      setSending(true);
      const { data } = await api.post(
        `/api/documents/${documentId}/collaborators`,
        {
          email,
          permission,
        }
      );

      if (data.invitation) {
        setSentInvitations((prev) => [...prev, data.invitation]);
        setSuccessMessage("Invitation sent. The user will need to accept it.");
      } else {
        setSuccessMessage("User added as collaborator immediately!");
      }

      setEmail("");
      setPermission("read");
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      await api.delete(`/api/invitations/${invitationId}`);
      setSentInvitations((prev) =>
        prev.filter((inv) => inv._id !== invitationId)
      );
    } catch (err) {
      setError("Failed to cancel invitation");
    }
  };

  const generateShareableLink = () => {

    const token = generateSecureToken();

    const linkData = {
      documentId,
      permission: linkPermission,
      created: new Date().toISOString(),
    };

    const existingLinks = JSON.parse(
      localStorage.getItem("shareLinks") || "{}"
    );
    existingLinks[token] = linkData;
    localStorage.setItem("shareLinks", JSON.stringify(existingLinks));

    const baseUrl = window.location.origin;
    const shareableLink = `${baseUrl}/shared/${token}`;

    setGeneratedLink(shareableLink);
    return shareableLink;
  };

  const handleGenerateLink = () => {
    const link = generateShareableLink();
    setGeneratedLink(link);
    setLinkCopied(false);
  };

  const handleCopyLink = () => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
      document.execCommand("copy");
      setLinkCopied(true);

      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="flex justify-between items-center border-b border-slate-700 p-4">
          <h2 className="text-xl font-bold text-white">Share Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex border-b border-slate-700 mb-4">
            <button
              onClick={() => setActiveTab("email")}
              className={`flex items-center py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === "email"
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              <FiMail className="mr-2" /> Email Invite
            </button>
            <button
              onClick={() => setActiveTab("link")}
              className={`flex items-center py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === "link"
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              <FiLink className="mr-2" /> Share Link
            </button>
          </div>
          {activeTab === "email" && (
            <form onSubmit={handleSendInvitation}>
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="colleague@example.com"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="permission"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Permission Level
                </label>
                <select
                  id="permission"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="read">Read only</option>
                  <option value="write">Can edit</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {error && (
                <div className="mb-4 p-2 bg-red-500/20 border border-red-500/40 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="mb-4 p-2 bg-green-500/20 border border-green-500/40 rounded text-green-400 text-sm">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : "Send Invitation"}
              </button>
            </form>
          )}
          {activeTab === "link" && (
            <div>
              <div className="mb-4">
                <label
                  htmlFor="linkPermission"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Anyone with the link can:
                </label>
                <select
                  id="linkPermission"
                  value={linkPermission}
                  onChange={(e) => setLinkPermission(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="read">View only</option>
                  <option value="write">Edit</option>
                  <option value="admin">Admin (Full control)</option>
                </select>
              </div>

              <button
                onClick={handleGenerateLink}
                className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Generate Shareable Link
              </button>

              {generatedLink && (
                <div className="mt-4">
                  <label
                    htmlFor="shareableLink"
                    className="block text-sm font-medium text-slate-300 mb-1"
                  >
                    Shareable Link
                  </label>
                  <div className="flex">
                    <input
                      ref={linkInputRef}
                      id="shareableLink"
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-l-md px-3 py-2 text-white focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="bg-slate-600 hover:bg-slate-500 px-3 rounded-r-md border border-slate-600 flex items-center justify-center"
                    >
                      {linkCopied ? (
                        <FiCheck className="text-green-400" />
                      ) : (
                        <FiCopy className="text-slate-300" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Anyone with this link can access this document with the
                    selected permissions
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-medium text-white mb-2">
              Pending Invitations
            </h3>

            {loading ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-2 text-slate-400 text-sm">
                  Loading invitations...
                </p>
              </div>
            ) : sentInvitations.length > 0 ? (
              <div className="space-y-3">
                {sentInvitations.map((invitation) => (
                  <div
                    key={invitation._id}
                    className="bg-slate-700/50 rounded-md p-3 flex items-start"
                  >
                    <div className="bg-blue-600/20 p-2 rounded-md mr-3">
                      <FiMail className="text-blue-400" />
                    </div>

                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {invitation.recipientEmail}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full">
                          {invitation.permission}
                        </span>
                        <span className="text-xs text-slate-400 ml-2 flex items-center">
                          <FiClock className="mr-1" size={12} />
                          Expires: {formatDate(invitation.expiresAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelInvitation(invitation._id)}
                      className="text-slate-400 hover:text-white p-1"
                      title="Cancel invitation"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">
                No pending invitations
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
