import api from "./api";

// Add this function to check if user is authenticated with GitHub
export const isGitHubAuthenticated = () => {
  const token = localStorage.getItem("githubToken");
  return !!token; // Returns true if token exists, false otherwise
};

export const initGitHubAuth = () => {
  // GitHub OAuth App credentials (read from environment variables)
  const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const REDIRECT_URI = `${window.location.origin}/github/callback`;

  if (!GITHUB_CLIENT_ID) {
    console.error("Missing GitHub client ID in environment variables");
    alert("GitHub integration is misconfigured. Please contact support.");
    return;
  }

  // Generate random state for CSRF protection
  const state = Math.random().toString(36).substring(2);
  localStorage.setItem("githubOAuthState", state);

  // Explicitly request the 'repo' scope which is needed for private repos
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=repo&state=${state}`;

  // Save current location to return after auth
  localStorage.setItem("githubReturnTo", window.location.pathname);

  window.location.href = authUrl;
};

// Add this function to handle the OAuth callback
export const handleGitHubCallback = async (code, state) => {
  // Verify state to prevent CSRF attacks
  const savedState = localStorage.getItem("githubOAuthState");
  if (state !== savedState) {
    throw new Error("Invalid state parameter");
  }

  try {
    // Exchange code for access token (server-side)
    const response = await api.post("/api/github/authenticate", { code });

    console.log("GitHub authentication successful");

    // Store GitHub token
    localStorage.setItem("githubToken", response.data.access_token);

    return response.data;
  } catch (error) {
    console.error("GitHub authentication error:", error);
    throw error;
  }
};

// Add a verification function that can be used to check if the token is valid
export const verifyGitHubToken = async () => {
  const token = localStorage.getItem("githubToken");
  if (!token) return false;

  try {
    const response = await api.get("/api/github/verify-token", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.valid;
  } catch (error) {
    console.error("GitHub token verification failed:", error);
    localStorage.removeItem("githubToken");
    return false;
  }
};
