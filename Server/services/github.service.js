import axios from "axios";
import { Octokit } from "@octokit/rest";

export const authenticateWithGitHub = async (code) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  try {
    // Log values for debugging (remove sensitive data in production)
    console.log("GitHub OAuth - Client ID exists:", !!clientId);
    console.log("GitHub OAuth - Client Secret exists:", !!clientSecret);
    console.log("GitHub OAuth - Code provided:", !!code);

    // Exchange code for token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    // Check for error in the response
    if (tokenResponse.data.error) {
      console.error("GitHub OAuth error:", tokenResponse.data);
      throw new Error(
        tokenResponse.data.error_description || tokenResponse.data.error
      );
    }

    return tokenResponse.data;
  } catch (error) {
    console.error("GitHub authentication error:", error);
    // Forward the actual error message from GitHub
    throw error.response?.data || error;
  }
};

export const createGitHubClient = (token) => {
  return new Octokit({ auth: token });
};

export const createRepository = async (
  token,
  name,
  description,
  isPrivate = false
) => {
  const octokit = createGitHubClient(token);

  try {
    const response = await octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true, // Initialize with README
    });

    return response.data;
  } catch (error) {
    console.error("Error creating GitHub repository:", error);
    throw new Error("Failed to create GitHub repository");
  }
};

// More GitHub API methods...
export const getRepositories = async (token) => {
  const octokit = createGitHubClient(token);

  try {
    const response = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: "updated",
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error);
    throw new Error("Failed to fetch GitHub repositories");
  }
};

export const getRepository = async (token, owner, repo) => {
  const octokit = createGitHubClient(token);

  try {
    const response = await octokit.repos.get({
      owner,
      repo,
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching GitHub repository:", error);
    throw new Error("Failed to fetch GitHub repository");
  }
};
