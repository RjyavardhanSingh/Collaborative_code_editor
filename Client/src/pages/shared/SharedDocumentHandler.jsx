import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import api from "../../lib/api";

export default function SharedDocumentHandler() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { currentuser } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSharedLink = async () => {
      try {
        setLoading(true);
        const shareLinks = JSON.parse(
          localStorage.getItem("shareLinks") || "{}"
        );
        const linkData = shareLinks[token];

        if (!linkData) {
          setError("This link is invalid or has expired");
          setLoading(false);
          return;
        }
        const created = new Date(linkData.created);
        const now = new Date();
        const diff = now.getTime() - created.getTime();
        const days = diff / (1000 * 3600 * 24);

        if (days > 7) {
          setError("This link has expired");
          delete shareLinks[token];
          localStorage.setItem("shareLinks", JSON.stringify(shareLinks));
          setLoading(false);
          return;
        }
        if (!currentuser) {
          navigate(`/login?redirect=/shared/${token}`);
          return;
        }
        navigate(`/documents/${linkData.documentId}`);
      } catch (err) {
        console.error("Error handling shared link:", err);
        setError("Could not access this document");
        setLoading(false);
      }
    };

    handleSharedLink();
  }, [token, navigate, currentuser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-300">Accessing shared document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 max-w-md w-full">
          <h1 className="text-xl font-bold text-white mb-4">Link Error</h1>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return null;
}
