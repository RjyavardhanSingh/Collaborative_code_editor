import api from "./api";
import fs from "fs/promises";
import path from "path";
import { safeGitOperation } from "./gitOperations"; // Adjust the import based on your project structure

// Update the isGitHubAuthenticated function
export const isGitHubAuthenticated = () => {
  const token = localStorage.getItem("githubToken");

  // Only consider the token valid if it has the proper GitHub token format
  if (!token || !token.startsWith("gho_")) {
    localStorage.removeItem("githubToken"); // Clear invalid token
    return false;
  }

  return true;
};

export const initGitHubAuth = () => {
  // GitHub OAuth App credentials
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

  // Store exact current location including path, search params, and hash
  localStorage.setItem(
    "githubReturnTo",
    window.location.pathname + window.location.search
  );

  // IMPORTANT: Include repo scope for repository creation permissions
  const scope = "repo";
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(scope)}&state=${state}`;

  // Use same window instead of opening a new tab
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

    // IMPORTANT: Log the entire response to see what we're getting
    console.log("GitHub authentication full response:", response);
    console.log("GitHub authentication data:", response.data);

    // GitHub OAuth returns access_token directly in most cases
    let token = null;

    // Try all possible locations where the token might be
    if (response.data.access_token) {
      token = response.data.access_token;
    } else if (response.data.data && response.data.data.access_token) {
      token = response.data.data.access_token;
    } else if (
      typeof response.data === "string" &&
      response.data.includes("access_token=")
    ) {
      // Handle string format: "access_token=abc123&token_type=bearer&scope=repo"
      const params = new URLSearchParams(response.data);
      token = params.get("access_token");
    }

    if (!token) {
      console.error("Could not extract token from response:", response.data);
      throw new Error("No access token received from GitHub");
    }

    // Store GitHub token
    console.log(
      "Saving GitHub token to localStorage:",
      token.substring(0, 5) + "..."
    );
    localStorage.setItem("githubToken", token);

    return { token, ...response.data };
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
    // Change from header to query parameter
    const response = await api.get(
      `/api/github/verify-token?token=${encodeURIComponent(token)}`
    );
    return response.data.valid;
  } catch (error) {
    console.error("GitHub token verification failed:", error);
    localStorage.removeItem("githubToken");
    return false;
  }
};

// Update the publishToGitHub function
export const publishToGitHub = async (
  folderId,
  options,
  setLoading,
  setError,
  setRepoStatus
) => {
  try {
    if (setLoading) setLoading(true);
    if (setError) setError(null);

    const token = localStorage.getItem("githubToken");
    const authToken = localStorage.getItem("authToken"); // Get app auth token

    if (!token) {
      if (setError) setError("GitHub authentication required");
      return false;
    }

    console.log(
      `Using GitHub token for publishing: ${token.substring(0, 8)}...`
    );

    const { name, description, isPrivate, addReadme } = options;

    // Send both tokens - GitHub token as query param and app token as Bearer
    const response = await api.post(
      `/api/github/publish/${folderId}?token=${encodeURIComponent(token)}`,
      { name, description, isPrivate, addReadme },
      {
        headers: {
          Authorization: `Bearer ${authToken}`, // App authentication token
          "X-Github-Token": token, // GitHub token as custom header
        },
      }
    );

    console.log("Published to GitHub:", response.data);
    if (setRepoStatus) setRepoStatus("published");
    return response.data;
  } catch (err) {
    console.error("Failed to publish to GitHub:", err);
    // Provide more detailed error message
    let errorMsg = "Failed to publish to GitHub";
    if (err.response?.status === 401) {
      errorMsg +=
        ": Authentication failed. Please reconnect your GitHub account.";
    } else if (err.response?.data?.message) {
      errorMsg += `: ${err.response.data.message}`;
    } else {
      errorMsg += `: ${err.message}`;
    }

    if (setError) setError(errorMsg);
    return false;
  } finally {
    if (setLoading) setLoading(false);
  }
};

// Also add the initializeLocalRepo function which might be needed
export const initializeLocalRepo = async (
  folderId,
  setLoading,
  setError,
  setRepoStatus
) => {
  try {
    if (setLoading) setLoading(true);
    if (setError) setError(null);

    const token = localStorage.getItem("githubToken");
    if (!token) {
      if (setError) setError("GitHub authentication required");
      return false;
    }

    const response = await api.post(
      `/api/github/local-init/${folderId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Local repository initialized:", response.data);
    if (setRepoStatus) setRepoStatus("initialized");

    return response.data;
  } catch (err) {
    console.error("Failed to initialize local repository:", err);
    if (setError)
      setError(
        "Failed to initialize local repository: " +
          (err.response?.data?.message || err.message)
      );
    return false;
  } finally {
    if (setLoading) setLoading(false);
  }
};

// Use the safe operation in publishToGitHub
const repoPath = path.join(REPOS_DIR, folderId.toString());

try {
  await safeGitOperation(repoPath, async (git) => {
    // First completely remove any existing Git setup
    try {
      await fs.rm(path.join(repoPath, ".git"), {
        recursive: true,
        force: true,
      });
    } catch (err) {
      // Ignore errors if .git doesn't exist
    }

    // Initialize fresh repository
    await git.init();
    console.log("Initialized fresh Git repository");

    // Rest of your Git operations...
  });
} catch (error) {
  console.error("Error in Git operations:", error);
  throw error;
}
