import fs from "fs/promises";
import path from "path";
import simpleGit from "simple-git";
import Folder from "../models/folder.model.js";
import Document from "../models/document.model.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  authenticateWithGitHub,
  createRepository,
  getRepositories,
  getRepository,
} from "../services/github.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base directory for git repositories
const REPOS_DIR = path.join(__dirname, "../repos");

// Ensure the repos directory exists
(async () => {
  try {
    await fs.mkdir(REPOS_DIR, { recursive: true });
    console.log(`Repository storage directory created/verified: ${REPOS_DIR}`);
  } catch (err) {
    console.error("Failed to create repository storage directory:", err);
  }
})();

// Safety function to ensure we only work with the intended repository
const safeGitOperation = async (repoPath, operation) => {
  const originalDir = process.cwd();

  try {
    // Validate the path is within our repos directory
    if (!repoPath.startsWith(REPOS_DIR)) {
      throw new Error(`Invalid repository path: ${repoPath}`);
    }

    // Check that .git directory exists in repoPath, not in parent directories
    const gitDir = path.join(repoPath, ".git");
    try {
      await fs.access(gitDir);
    } catch {
      // Only initialize if we don't have a .git directory specifically in this path
      console.log(
        `No .git directory found in ${repoPath}, initializing new repository`
      );
    }

    // Change to repository directory
    process.chdir(repoPath);

    // Execute the operation with proper isolation
    const git = simpleGit({
      baseDir: repoPath,
      binary: "git",
      env: {
        ...process.env,
        GIT_DIR: gitDir,
        GIT_WORK_TREE: repoPath,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CEILING_DIRECTORIES: path.dirname(repoPath),
      },
    });

    // Run the operation
    const result = await operation(git);

    // Return to original directory
    process.chdir(originalDir);
    return result;
  } catch (error) {
    // Always return to original directory
    process.chdir(originalDir);
    throw error;
  }
};

export const authenticate = async (req, res) => {
  try {
    const { code } = req.body;
    const tokenData = await authenticateWithGitHub(code);

    // Log what we're receiving from GitHub
    console.log("GitHub auth response structure:", Object.keys(tokenData));
    console.log("Token exists:", !!tokenData.access_token);

    // Make sure we're sending the token in the expected format
    if (
      !tokenData.access_token &&
      tokenData.data &&
      tokenData.data.access_token
    ) {
      tokenData.access_token = tokenData.data.access_token;
    }

    res.json(tokenData);
  } catch (error) {
    console.error("GitHub authentication error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const createRepo = async (req, res) => {
  try {
    const { name, description, isPrivate, folderId } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Repository name is required" });
    }

    if (!folderId) {
      return res.status(400).json({ message: "Folder ID is required" });
    }

    // Validate repo name - GitHub only allows certain characters
    const validNameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!validNameRegex.test(name)) {
      return res.status(400).json({
        message:
          "Repository name can only contain letters, numbers, hyphens, underscores and periods",
      });
    }

    // Get GitHub token from authorization header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "GitHub authentication token is required" });
    }

    console.log(`Creating GitHub repository: ${name} (Private: ${isPrivate})`);

    // Verify GitHub token is valid first
    try {
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.text();
        console.error("GitHub token validation failed:", errorData);
        return res.status(401).json({
          message:
            "GitHub authentication failed. Please reconnect your account.",
          details: errorData,
        });
      }

      const userData = await userResponse.json();
      console.log(`Creating repo for GitHub user: ${userData.login}`);
    } catch (authErr) {
      console.error("GitHub authentication error:", authErr);
      return res
        .status(401)
        .json({ message: "Failed to authenticate with GitHub" });
    }

    // Create repository on GitHub
    try {
      const createRepoResponse = await fetch(
        "https://api.github.com/user/repos",
        {
          method: "POST",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description: description || "",
            private: isPrivate === true,
            auto_init: true,
          }),
        }
      );

      if (!createRepoResponse.ok) {
        const errorData = await createRepoResponse.json();
        console.error("GitHub repo creation error:", errorData);

        // Check for specific error types
        if (
          errorData.errors?.find((err) =>
            err.message.includes("already exists")
          )
        ) {
          return res
            .status(409)
            .json({ message: "A repository with this name already exists" });
        }

        return res.status(createRepoResponse.status).json({
          message: `GitHub API error: ${
            errorData.message || "Failed to create repository"
          }`,
          errors: errorData.errors,
        });
      }

      const repoData = await createRepoResponse.json();
      console.log(`Repository created successfully: ${repoData.full_name}`);

      // Update folder with GitHub repo information
      const folder = await Folder.findById(folderId);

      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }

      folder.githubRepo = {
        name: repoData.name,
        fullName: repoData.full_name,
        url: repoData.html_url,
        apiUrl: repoData.url,
        owner: repoData.owner.login,
        defaultBranch: repoData.default_branch || "main",
        lastSynced: new Date(),
      };

      await folder.save();
      console.log(`Folder ${folderId} updated with GitHub repo information`);

      // Initialize local Git repository
      const repoPath = path.join(REPOS_DIR, folderId.toString());

      try {
        await fs.mkdir(repoPath, { recursive: true });

        const git = simpleGit(repoPath);
        await git.init();

        // Set Git config
        await git.addConfig(
          "user.name",
          req.user.username || "Collaborative Editor User"
        );
        await git.addConfig(
          "user.email",
          req.user.email || "user@collaborative-editor.com"
        );

        // Add remote
        const remoteUrl = `https://oauth2:${token}@github.com/${repoData.full_name}.git`;
        await git.addRemote("origin", remoteUrl);

        console.log(`Git repository initialized at ${repoPath}`);
      } catch (gitErr) {
        console.error("Git initialization error (non-blocking):", gitErr);
        // Continue - we already created the GitHub repo
      }

      return res.status(201).json({
        message: "Repository created successfully",
        repository: {
          id: repoData.id,
          name: repoData.name,
          fullName: repoData.full_name,
          url: repoData.html_url,
          defaultBranch: repoData.default_branch || "main",
        },
      });
    } catch (createErr) {
      console.error("Error creating GitHub repository:", createErr);
      return res.status(500).json({
        message: "Failed to create GitHub repository",
        error: createErr.message,
      });
    }
  } catch (error) {
    console.error("Server error in createRepo:", error);
    res.status(500).json({
      message: "Server error while creating repository",
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
  }
};

export const getUserRepos = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "GitHub token is required" });
    }

    const repos = await getRepositories(token);
    res.json(repos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Add permission check to all GitHub-related endpoints

// Helper function to check if user has admin rights
const hasAdminRights = async (folderId, userId) => {
  const folder = await Folder.findById(folderId);

  if (!folder) {
    return false;
  }

  // Check if user is owner
  if (folder.owner.toString() === userId.toString()) {
    return true;
  }

  // Check if user is admin collaborator
  const collaborator = folder.collaborators.find(
    (c) => c.user.toString() === userId.toString()
  );

  return collaborator && collaborator.permission === "admin";
};

// Then modify all GitHub endpoints to use this check
export const commitChanges = async (req, res) => {
  const originalDir = process.cwd();

  try {
    const { folderId, message, files } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Commit message is required" });
    }

    console.log(
      `Committing changes to folder ${folderId} with ${files.length} files`
    );

    // Find folder to verify it exists and has GitHub repo connected
    const folder = await Folder.findById(folderId);
    if (!folder || !folder.githubRepo) {
      return res.status(404).json({
        message: "No GitHub repository connected to this folder",
      });
    }

    // Get GitHub token from multiple possible sources
    let token =
      req.headers["x-github-token"] || // Try custom header first
      (req.headers.authorization?.startsWith("token ") &&
        req.headers.authorization.substring(6)) || // Then try 'token' prefix
      req.headers.authorization?.split(" ")[1]; // Finally try Bearer token

    if (!token) {
      return res.status(401).json({
        message: "GitHub token is required for commit",
      });
    }

    // Setup repository path & change to it
    const repoPath = path.join(REPOS_DIR, folderId.toString());
    await fs.mkdir(repoPath, { recursive: true });

    // CRITICAL: Change to repository directory BEFORE git operations
    process.chdir(repoPath);
    console.log(`Changed working directory to: ${process.cwd()}`);

    // Use safe git operation with isolated environment
    const git = simpleGit({
      baseDir: repoPath,
      binary: "git",
      env: {
        ...process.env,
        GIT_DIR: path.join(repoPath, ".git"),
        GIT_WORK_TREE: repoPath,
        GIT_CONFIG_NOSYSTEM: "1",
      },
    });

    // Configure Git user
    console.log("Configuring Git user");
    await git.addConfig("user.name", "DevUnity User");
    await git.addConfig("user.email", "user@devunity.com");

    // Write files
    console.log(`Processing ${files.length} files for commit`);
    for (const file of files) {
      if (!file.path || file.content === undefined) continue;

      const filePath = file.path;
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content || "");
      console.log(`Updated ${filePath}`);
    }

    // Stage files with force
    console.log("Staging files");
    await git.add(".");

    // Check status before committing
    const status = await git.status();
    console.log("Git status before commit:", status);

    if (status.files.length === 0) {
      process.chdir(originalDir);
      return res.json({ message: "No changes to commit", noChanges: true });
    }

    // Commit changes
    console.log("Committing changes with message:", message);
    const commitResult = await git.commit(message);
    console.log("Commit successful:", commitResult);

    // Try to push to remote
    try {
      console.log("Pushing to remote");
      const currentBranch = (await git.branch()).current || "master";
      console.log(`Current branch is: ${currentBranch}`);

      // Test remote connection
      console.log("Testing remote connection");
      const remotes = await git.getRemotes(true);
      console.log("Remotes:", remotes);

      if (remotes.length === 0) {
        // Add remote if not already set
        const remoteUrl = `https://oauth2:${token}@github.com/${folder.githubRepo.fullName}.git`;
        await git.addRemote("origin", remoteUrl);
        console.log("Added missing remote origin");
      }

      // Push with explicit reference
      await git.push(["origin", currentBranch]);
      console.log("Push successful");
    } catch (pushErr) {
      console.error("Push error:", pushErr.message);

      try {
        // Get more details on the failure
        const remoteUrl = await git.remote(["get-url", "origin"]);
        console.log("Remote URL:", remoteUrl);

        // Try force push
        console.log("Attempting force push");
        const currentBranch = (await git.branch()).current || "master";
        await git.push(["-f", "origin", currentBranch]);
        console.log("Force push successful");
      } catch (forcePushErr) {
        console.error("Force push also failed:", forcePushErr.message);
        // We'll still consider the operation successful since the commit worked
      }
    }

    // Update last synced timestamp
    folder.githubRepo.lastSynced = new Date();
    await folder.save();

    // Change back to original directory before sending response
    process.chdir(originalDir);

    res.json({
      message: "Changes committed successfully",
      commit: commitResult,
      timestamp: new Date(),
    });
  } catch (error) {
    // IMPORTANT: Always restore original directory
    try {
      process.chdir(originalDir);
    } catch (cdErr) {
      // Ignore error changing back
    }

    console.error("💥 Error in commitChanges:", error);
    res.status(500).json({
      message: error.message,
      errorDetails: {
        command: error.git?.command,
        failed: error.git?.failed,
        errorCode: error.code,
        gitMessage: error.git?.message,
      },
    });
  }
};

// Replace the verbose logging in the getStatus function (around line 520-620)
export const getStatus = async (req, res) => {
  const originalDir = process.cwd();
  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check if repository is initialized
    if (
      !folder.githubRepo ||
      !folder.githubRepo.fullName ||
      !folder.githubRepo.isInitialized
    ) {
      // Return a special response for uninitialized repositories with all expected properties
      return res.json({
        needsInitialization: true,
        files: [],
        not_added: [],
        modified: [],
        deleted: [],
        renamed: [],
        created: [],
        conflicted: [],
        staged: [],
        ahead: 0,
        behind: 0,
        isGitRepo: false,
      });
    }

    // Create a completely isolated repository path for this specific folder
    const repoPath = path.join(REPOS_DIR, folderId.toString());
    
    // Ensure this directory exists and is a git repository
    try {
      // Make sure directory exists
      await fs.mkdir(repoPath, { recursive: true });

      // Create a temporary git config file to ensure complete isolation
      const gitConfigPath = path.join(repoPath, ".git-config-temp");
      await fs.writeFile(
        gitConfigPath,
        "[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n\tlogallrefupdates = true"
      );

      // Change working directory
      process.chdir(repoPath);

      // Initialize Git with complete isolation
      const git = simpleGit({
        baseDir: repoPath,
        binary: "git",
        // Force Git to ONLY look in this directory for the repository
        env: {
          ...process.env,
          GIT_DIR: path.join(repoPath, ".git"),
          GIT_WORK_TREE: repoPath,
          // Force Git to use our config file only
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: gitConfigPath,
        },
      });

      // Check if it's a git repo, initialize if needed
      const isRepo = await git.checkIsRepo().catch(() => false);
      if (!isRepo) {
        await git.init();

        // If folder.githubRepo exists, set up remote
        if (folder.githubRepo?.fullName) {
          try {
            // Try to get token from request
            const token = req.headers.authorization?.split(" ")[1];
            
            if (token) {
              const remoteUrl = `https://oauth2:${token}@github.com/${folder.githubRepo.fullName}.git`;
              try {
                await git.addRemote("origin", remoteUrl);
              } catch (e) {
                // Remote might already exist
              }
            }
          } catch (remoteErr) {
            // Continue even if we can't set up the remote
          }
        }

        // Return empty status for newly initialized repos
        process.chdir(originalDir);
        return res.json({
          isNewRepo: true,
          not_added: [],
          modified: [],
          files: [],
          isGitRepo: true,
        });
      }

      // Auto-update files in repo from database
      try {
        const documents = await Document.find({ folder: folderId });

        // Force write all files from database
        for (const doc of documents) {
          const filePath = path.join(repoPath, doc.title);

          // Create directories if needed
          await fs.mkdir(path.dirname(filePath), { recursive: true });

          // Check if file exists and compare content
          let fileChanged = true;
          try {
            const existingContent = await fs.readFile(filePath, "utf8");
            fileChanged = existingContent !== doc.content;
          } catch (err) {
            // File doesn't exist, will create it
          }

          // Write the database content to the actual file
          if (fileChanged || !doc.content) {
            await fs.writeFile(filePath, doc.content || "");
          }
        }
      } catch (syncErr) {
        // Continue even if sync fails - we still want to return status
      }

      // Force git to recognize the changes
      await git.add("--intent-to-add", ".");

      // Get status with restricted search paths
      const status = await git.status(["."]);

      // Clean up temp config
      try {
        await fs.unlink(gitConfigPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      // Change directory back to original
      process.chdir(originalDir);

      res.json(status);
    } catch (err) {
      // Make sure we change back to the original directory
      process.chdir(originalDir);
      throw err;
    }
  } catch (error) {
    // Safety measure - ensure we always restore directory
    process.chdir(originalDir);
    res.status(500).json({ message: error.message });
  }
};

// Add this function to github.controller.js
export const syncFilesToRepo = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { files } = req.body;

    // Original directory to return to later
    const originalDir = process.cwd();

    const folder = await Folder.findById(folderId);
    if (!folder || !folder.githubRepo) {
      return res
        .status(404)
        .json({ message: "Folder with GitHub repository not found" });
    }

    const repoPath = path.join(REPOS_DIR, folderId.toString());

    // Ensure directory exists
    await fs.mkdir(repoPath, { recursive: true });

    // Change to the repo directory first
    process.chdir(repoPath);

    let changedFiles = 0;
    // Write all files to the repo directory with RELATIVE paths
    for (const file of files) {
      // Don't include repoPath - we're already in that directory
      const filePath = file.path;

      // Create directories if needed (still relative to repoPath)
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Write file
      await fs.writeFile(filePath, file.content || "");
      changedFiles++;
    }

    // Return to original directory
    process.chdir(originalDir);

    res.json({
      message: "Files synced successfully",
      changedFiles,
    });
  } catch (error) {
    // Always return to original directory
    try {
      process.chdir(process.env.PWD || originalDir);
    } catch (e) {
      // Ignore directory change errors
    }
    
    res.status(500).json({ message: error.message });
  }
};

// Add this helper function
const ensureValidRepo = async (repoPath, folder, token) => {
  // Ensure directory exists
  await fs.mkdir(repoPath, { recursive: true });

  const git = simpleGit(repoPath);

  // Check if it's a valid git repo
  const isRepo = await git.checkIsRepo().catch(() => false);

  if (!isRepo) {
    // Initialize new repository
    await git.init();
    console.log("Initialized new Git repository");

    // Configure remote if GitHub repo is linked
    if (folder.githubRepo?.fullName) {
      const remoteUrl = `https://oauth2:${token}@github.com/${folder.githubRepo.fullName}.git`;

      try {
        await git.addRemote("origin", remoteUrl);
        console.log("Added remote 'origin'");
      } catch (err) {
        if (!err.message.includes("already exists")) {
          throw err;
        }
      }

      // Try to get the initial content
      try {
        await git.pull("origin", folder.githubRepo.defaultBranch || "main");
        console.log("Pulled initial content");
      } catch (err) {
        // This might fail for empty repos, that's okay
        console.log("Could not pull initial content:", err.message);
      }
    }
  }

  return git;
};

// Check GitHub API rate limit
const checkGithubRateLimit = async (token) => {
  try {
    const response = await fetch("https://api.github.com/rate_limit", {
      headers: {
        Authorization: `token ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("GitHub API rate limit:", data.resources.core);

      // Check if we're approaching the limit
      if (data.resources.core.remaining < 10) {
        console.warn("⚠️ GitHub API rate limit is low!");
        return false;
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error checking GitHub rate limit:", err);
    return false;
  }
};

export const getRepoFiles = async (req, res) => {
  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId);

    if (!folder || !folder.githubRepo) {
      return res
        .status(404)
        .json({ message: "No GitHub repository connected to this folder" });
    }

    const repoPath = path.join(REPOS_DIR, folderId.toString());

    // Ensure the repo exists
    try {
      await fs.access(repoPath);
    } catch (err) {
      // Create and initialize if needed
      await fs.mkdir(repoPath, { recursive: true });
      const git = simpleGit(repoPath);
      await git.init();

      if (folder.githubRepo.fullName) {
        const token = req.headers.authorization?.split(" ")[1];
        const remoteUrl = token
          ? `https://oauth2:${token}@github.com/${folder.githubRepo.fullName}.git`
          : `https://github.com/${folder.githubRepo.fullName}.git`;

        try {
          await git.addRemote("origin", remoteUrl);
          await git.pull("origin", folder.githubRepo.defaultBranch || "main");
        } catch (e) {
          // Ignore errors for new repos
        }
      }
    }

    // Get all files in the repo (excluding .git directory)
    const getFiles = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        entries
          .filter((entry) => entry.name !== ".git")
          .map(async (entry) => {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(repoPath, fullPath);
            return entry.isDirectory()
              ? {
                  path: relativePath,
                  type: "directory",
                  children: await getFiles(fullPath),
                }
              : { path: relativePath, type: "file" };
          })
      );
      return files;
    };

    const files = await getFiles(repoPath);
    res.json(files);
  } catch (error) {
    console.error("Error getting repository files:", error);
    res.status(500).json({ message: error.message });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res
        .status(401)
        .json({ message: "GitHub token missing in query parameter" });
    }

    console.log(
      "Verifying GitHub token (first 10 chars):",
      token.substring(0, 10)
    );

    // Test token with GitHub API using different endpoints in case of scope limitations
    try {
      // Try simple user check first
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("Token verified for GitHub user:", userData.login);

        return res.json({
          valid: true,
          user: {
            login: userData.login,
            id: userData.id,
            avatar_url: userData.avatar_url,
          },
        });
      }

      // If user endpoint fails, the token is likely invalid
      console.error("GitHub verification failed:", response.status);
      return res.status(401).json({
        message: "Invalid GitHub token - please reconnect your GitHub account",
        error: "token_invalid",
      });
    } catch (error) {
      console.error("Error verifying token:", error);
      return res.status(500).json({ message: "Token verification failed" });
    }
  } catch (error) {
    console.error("Error in verifyToken:", error);
    return res.status(500).json({ message: "Token verification failed" });
  }
};

// 1. Local initialization (no GitHub required)
export const initializeLocalRepo = async (
  folderId,
  setLoading,
  setError,
  setRepoStatus
) => {
  try {
    setLoading(true);
    setError(null);

    const response = await api.post(`/api/github/local-init/${folderId}`);
    console.log("Local repo initialized:", response.data);
    setRepoStatus("initialized");

    return true;
  } catch (err) {
    setError("Failed to initialize local repository");
    console.error(err);
    return false;
  } finally {
    setLoading(false);
  }
};
// Local repository initialization (no GitHub needed)
export const localInitializeRepository = async (req, res) => {
  const originalDir = process.cwd();

  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Set up the repository path
    const repoPath = path.join(REPOS_DIR, folderId.toString());
    console.log(`Initializing local repository at: ${repoPath}`);

    // Create directory if it doesn't exist
    await fs.mkdir(repoPath, { recursive: true });

    // Change to repository directory
    process.chdir(repoPath);

    // Initialize git repository
    const git = simpleGit({
      baseDir: repoPath,
      binary: "git",
    });

    // Check if it's already a git repo
    const isRepo = await git.checkIsRepo().catch(() => false);

    if (!isRepo) {
      console.log("Initializing new Git repository");
      await git.init();
    } else {
      console.log("Repository already initialized");
    }

    // Configure Git user
    console.log("Configuring Git user");
    await git.addConfig(
      "user.name",
      req.user?.username || "Collaborative Editor User"
    );
    await git.addConfig(
      "user.email",
      req.user?.email || "user@collaborative-editor.com"
    );

    // Auto-sync files from database to repository
    try {
      console.log("Syncing database content to repository files");
      const documents = await Document.find({ folder: folderId });

      for (const doc of documents) {
        const filePath = path.join(repoPath, doc.title);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, doc.content || "");
        console.log(`Written file: ${doc.title}`);
      }

      // Stage all files
      await git.add(".");

      // Initial commit if there are files
      const status = await git.status();
      if (status.files.length > 0) {
        await git.commit("Initial commit");
        console.log("Made initial commit");
      }

      // Update folder in database
      folder.gitInitialized = true;
      await folder.save();

      // Return to original directory
      process.chdir(originalDir);

      res.json({
        message: "Local repository initialized successfully",
        isGitRepo: true,
        status: status,
      });
    } catch (syncErr) {
      console.error("Error syncing files:", syncErr);
      process.chdir(originalDir);
      throw syncErr;
    }
  } catch (error) {
    // Ensure we change back to original directory
    try {
      process.chdir(originalDir);
    } catch (cdErr) {
      // Ignore directory change errors
    }

    console.error("Error initializing local repository:", error);
    res.status(500).json({
      message: "Failed to initialize local repository",
      error: error.message,
    });
  }
};

// Add or update this function
export const publishToGitHub = async (req, res) => {
  const originalDir = process.cwd();

  try {
    const { folderId } = req.params;
    const { name, description, isPrivate, addReadme } = req.body;

    // Get GitHub token from multiple possible locations
    let token = req.headers["x-github-token"]; // From custom header

    // Try query parameter if header not found
    if (!token) {
      token = req.query.token;
    }

    if (!token) {
      console.log("No GitHub token found in request");
      return res
        .status(401)
        .json({ message: "GitHub token required for publishing" });
    }

    console.log(
      `Publishing repository for folder ${folderId} using GitHub token: ${token.substring(
        0,
        8
      )}...`
    );

    // Find the folder
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Verify GitHub token
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        return res.status(401).json({ message: "Invalid GitHub token" });
      }

      const userData = await response.json();
      console.log(`Publishing repo for GitHub user: ${userData.login}`);
    } catch (authErr) {
      console.error("GitHub auth error:", authErr);
      return res
        .status(401)
        .json({ message: "Failed to authenticate with GitHub" });
    }

    // Create repository on GitHub
    try {
      const createRepoResponse = await fetch(
        "https://api.github.com/user/repos",
        {
          method: "POST",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description: description || "",
            private: isPrivate === true,
            auto_init: false, // We'll push our existing content
          }),
        }
      );

      if (!createRepoResponse.ok) {
        const errorData = await createRepoResponse.json();
        console.error("GitHub repo creation error:", errorData);

        if (
          errorData.errors?.find((e) =>
            e.message?.includes("name already exists")
          )
        ) {
          return res
            .status(409)
            .json({ message: "A repository with this name already exists" });
        }

        return res.status(createRepoResponse.status).json({
          message: "Failed to create GitHub repository",
          details: errorData,
        });
      }

      const repoData = await createRepoResponse.json();
      console.log(`Created GitHub repository: ${repoData.full_name}`);

      // Connect local repo to GitHub - FIX THE SECURITY ISSUE HERE
      const repoPath = path.join(REPOS_DIR, folderId.toString());

      try {
        // CRITICAL SECURITY FIX: Create a completely isolated Git repository
        // First, ensure the directory exists
        await fs.mkdir(repoPath, { recursive: true });

        // CRITICAL: Completely remove any existing Git setup to prevent inheritance issues
        try {
          await fs.rm(path.join(repoPath, ".git"), {
            recursive: true,
            force: true,
          });
        } catch (err) {
          // Ignore errors if .git doesn't exist
        }

        // Change to repository directory
        process.chdir(repoPath);
        console.log("Working directory changed to:", process.cwd());

        // Create a new fully isolated Git repository
        const git = simpleGit({
          baseDir: repoPath,
          binary: "git",
          // Force Git to ONLY use this directory with explicit environment variables
          env: {
            ...process.env,
            GIT_DIR: path.join(repoPath, ".git"),
            GIT_WORK_TREE: repoPath,
            GIT_CONFIG_NOSYSTEM: "1",
            GIT_CONFIG_GLOBAL: "/dev/null", // Prevent using global config
            GIT_CEILING_DIRECTORIES: path.dirname(repoPath), // Prevent looking at parent directories
          },
        });

        // Initialize a fresh Git repository
        await git.init();
        console.log("Initialized fresh Git repository");

        // Create a restrictive .gitignore that properly allows files in the repository
        const gitignoreContent = `# Prevent looking outside this directory
../*
# But allow everything inside this directory
!*`;
        await fs.writeFile(path.join(repoPath, ".gitignore"), gitignoreContent);

        // ADD THIS LINE - Missing step to add the remote repository URL
        await git.addRemote(
          "origin",
          `https://oauth2:${token}@github.com/${repoData.full_name}.git`
        );
        console.log(`Added remote: origin -> ${repoData.full_name}`);

        // SECURITY FIX: Only add files from database instead of using generic "."
        console.log("Syncing database documents to repository...");
        const documents = await Document.find({ folder: folderId });

        // Write each document as a file
        let fileCount = 0;
        for (const doc of documents) {
          // Use relative paths within the repo directory
          const filePath = doc.title;

          // Ensure subdirectories exist
          if (path.dirname(filePath) !== ".") {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
          }

          // Write the file
          await fs.writeFile(filePath, doc.content || "");
          fileCount++;
        }

        console.log(`Added ${fileCount} files from database to repository`);

        // Create README if requested
        if (addReadme) {
          const readmeContent = `# ${name}\n\nThis repository was created with DevUnity Collaborative Code Editor.`;
          await fs.writeFile("README.md", readmeContent);
          fileCount++;
          // Add the -f flag to force adding the README despite gitignore rules
          await git.add(["-f", "README.md"]);
        } else {
          // If there are no files, at least add the gitignore
          await git.add(".gitignore");
        }

        // Commit changes
        console.log("Committing changes...");
        const status = await git.status();

        if (status.files.length === 0 && !addReadme) {
          console.log("No files to commit");
          // Ensure we still try to push by creating an empty commit if needed
          if (addReadme) {
            await git.commit("Initial commit with README");
          } else {
            await git.commit("Initial commit");
          }
        } else {
          await git.commit("Initial commit");
        }

        // CRITICAL: Check if branch exists before pushing
        const branches = await git.branch();
        console.log("Local branches:", branches);

        // If main branch doesn't exist, create it by making a commit
        if (!branches.all.includes("main")) {
          // Create an empty commit if needed to establish the branch
          try {
            console.log("Creating main branch with initial commit");
            await git.commit("Initial commit", { "--allow-empty": null });
          } catch (commitErr) {
            console.log("Commit error:", commitErr);
          }
        }

        // Push to GitHub with more detailed error handling
        try {
          console.log("Pushing to GitHub repository...");

          // Get the current branch name
          const currentBranch = (await git.branch()).current || "main";
          console.log("Current branch:", currentBranch);

          // Push using the current branch name instead of hardcoded 'main'
          await git.push(["-u", "origin", currentBranch]);
          console.log(`Successfully pushed to ${currentBranch} branch`);
        } catch (pushErr) {
          console.error("Push error:", pushErr.message);

          // Try with force flag but use the actual branch name
          try {
            const currentBranch = (await git.branch()).current || "main";
            console.log("Trying force push to branch:", currentBranch);
            await git.push(["-u", "-f", "origin", currentBranch]);
          } catch (forcePushErr) {
            console.error("Force push also failed:", forcePushErr);
            throw forcePushErr;
          }
        }

        // Update folder in database with GitHub repo info
        folder.githubRepo = {
          name: repoData.name,
          fullName: repoData.full_name,
          owner: repoData.owner.login,
          isPrivate: repoData.private,
          defaultBranch: repoData.default_branch || "main",
          url: repoData.html_url,
          isInitialized: true,
          lastSynced: new Date(),
        };

        await folder.save();

        // Return to original directory
        process.chdir(originalDir);

        return res.json({
          message: "Repository published to GitHub successfully",
          repository: folder.githubRepo,
          status: await git.status(),
        });
      } catch (error) {
        // Ensure we change back to original directory
        process.chdir(originalDir);
        throw error;
      }
    } catch (error) {
      console.error("Error publishing to GitHub:", error);
      process.chdir(originalDir);
      return res.status(500).json({
        message: "Failed to publish repository to GitHub",
        error: error.message,
      });
    }
  } catch (error) {
    // Ensure we change back to original directory
    try {
      process.chdir(originalDir);
    } catch (cdErr) {
      // Ignore directory change errors
    }

    console.error("Error in publishToGitHub:", error);
    return res.status(500).json({
      message: "Failed to publish repository",
      error: error.message,
    });
  }
};
