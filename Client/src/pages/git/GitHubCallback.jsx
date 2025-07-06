import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import queryString from "query-string";
import { handleGitHubCallback } from "../../lib/githubAuth";

export default function GitHubCallback() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const { code, state } = queryString.parse(location.search);
        if (!code) {
          throw new Error("No code parameter found");
        }

        // Important: Get user JWT token before GitHub OAuth processing
        const jwt = localStorage.getItem("authToken"); // FIXED: Use authToken instead of token

        // Process GitHub authentication
        await handleGitHubCallback(code, state);

        // CRITICAL FIX: Restore user's JWT token if it exists
        if (jwt) {
          localStorage.setItem("authToken", jwt);

          // Use custom event instead of direct refreshAuth call
          window.dispatchEvent(new Event("auth:refresh"));
        }

        // Redirect back to previous page or dashboard
        const returnTo = localStorage.getItem("githubReturnTo") || "/dashboard";
        localStorage.removeItem("githubReturnTo");
        navigate(returnTo);
      } catch (err) {
        console.error("GitHub authentication error:", err);
        setError(err.message || "Authentication failed");
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [location, navigate]); // Remove refreshAuth from dependencies

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4 mx-auto"></div>
          <h2 className="text-xl text-white font-medium">
            Authenticating with GitHub...
          </h2>
          <p className="text-slate-400 mt-2">
            Please wait while we complete the process.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center bg-slate-800 p-6 rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-xl text-white font-medium">
            Authentication Failed
          </h2>
          <p className="text-slate-400 mt-2 mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
