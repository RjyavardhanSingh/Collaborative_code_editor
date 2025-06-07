import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiX, FiMail, FiCheck, FiSlash } from "react-icons/fi";
import api from "../../lib/api.js";
import { useNavigate } from "react-router-dom";

export default function UserInvitations({ onClose }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/users/invitations");
      setInvitations(data);
    } catch (err) {
      setError("Failed to load invitations");
      console.error("Error loading invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      const { data } = await api.post(
        `/api/invitations/${invitationId}/accept`
      );
      setInvitations((prev) => prev.filter((inv) => inv._id !== invitationId));

      // Navigate to the document
      navigate(`/documents/${data.documentId}`);
      onClose();
    } catch (err) {
      setError("Failed to accept invitation");
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      await api.post(`/api/invitations/${invitationId}/reject`);
      setInvitations((prev) => prev.filter((inv) => inv._id !== invitationId));
    } catch (err) {
      setError("Failed to reject invitation");
    }
  };

  if (invitations.length === 0 && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-16 right-4 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50"
      >
        <div className="flex justify-between items-center border-b border-slate-700 p-3">
          <h3 className="font-medium text-white">Document Invitations</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX size={18} />
          </button>
        </div>
        <div className="p-4 text-center text-slate-400">
          No pending invitations
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-16 right-4 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50"
    >
      <div className="flex justify-between items-center border-b border-slate-700 p-3">
        <h3 className="font-medium text-white">Document Invitations</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <FiX size={18} />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center p-4">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-slate-400 text-sm">
              Loading invitations...
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {invitations.map((invitation) => (
              <div key={invitation._id} className="bg-slate-700 rounded-md p-3">
                <div className="flex items-center mb-2">
                  <div className="bg-blue-600/30 p-1.5 rounded-md mr-2">
                    <FiMail className="text-blue-400" size={14} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {invitation.sender?.username || "Someone"}
                    </p>
                    <p className="text-xs text-slate-400">
                      invited you to collaborate
                    </p>
                  </div>
                </div>

                <p className="text-sm text-white font-medium mb-1">
                  {invitation.document?.title || "Untitled Document"}
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  Permission:{" "}
                  <span className="text-blue-400">{invitation.permission}</span>
                </p>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAcceptInvitation(invitation._id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-2 rounded flex items-center justify-center"
                  >
                    <FiCheck size={14} className="mr-1" /> Accept
                  </button>
                  <button
                    onClick={() => handleRejectInvitation(invitation._id)}
                    className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-xs font-medium py-1.5 px-2 rounded flex items-center justify-center"
                  >
                    <FiSlash size={14} className="mr-1" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
