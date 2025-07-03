import {
  authenticateWithGitHub,
  createRepository,
  getRepositories,
  getRepository,
} from "../services/github.service.js";
import Folder from "../models/folder.model.js";
import Document from "../models/document.model.js";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";

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

export const authenticate = async (req, res) => {
  try {
    const { code } = req.body;
    const tokenData = await authenticateWithGitHub(code);

    res.json(tokenData);
  } catch (error) {
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

// Function to initialize a local Git repository for a folder
const initializeLocalRepo = async (folderId, cloneUrl, token) => {
  const folderRepoPath = path.join(REPOS_DIR, folderId.toString());

  try {
    // Create directory if it doesn't exist
    await fs.mkdir(folderRepoPath, { recursive: true });

    // Initialize git in the folder
    const git = simpleGit(folderRepoPath);

    // Set up authentication for clone
    const authUrl = cloneUrl.replace("https://", `https://oauth2:${token}@`);

    // Clone the repository
    await git.clone(authUrl, ".");

    return folderRepoPath;
  } catch (error) {
    console.error(
      `Error initializing local repository for folder ${folderId}:`,
      error
    );
    throw new Error("Failed to initialize local Git repository");
  }
};

// More controller methods for git operations
export const commitChanges = async (req, res) => {
  try {
    const { folderId, message, files } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Commit message is required" });
    }

    // Log detailed info for debugging
    console.log("Commit request received:", {
      folderId,
      messageLength: message?.length,
      filesCount: files?.length,
      user: req.user?._id,
    });

    // Find folder to verify it exists and has GitHub repo connected
    const folder = await Folder.findById(folderId);

    if (!folder) {
      console.log(`Folder not found: ${folderId}`);
      return res.status(404).json({ message: "Folder not found" });
    }

    if (!folder.githubRepo) {
      console.log(`No GitHub repo connected to folder: ${folderId}`);
      return res
        .status(404)
        .json({ message: "No GitHub repository connected to this folder" });
    }

    // Get GitHub token for authentication
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.log("Missing GitHub token in request");
      return res
        .status(401)
        .json({ message: "GitHub token is required for commit" });
    }

    // Test GitHub token with a simple API request
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` },
      });
      if (!response.ok) {
        console.error("Invalid GitHub token:", await response.text());
        return res
          .status(401)
          .json({ message: "Invalid GitHub token - authentication failed" });
      }
      console.log("GitHub token is valid");
    } catch (tokenErr) {
      console.error("Error testing GitHub token:", tokenErr);
      return res
        .status(401)
        .json({ message: "Failed to validate GitHub token" });
    }

    // Setup repository path
    const repoPath = path.join(REPOS_DIR, folderId.toString());
    console.log(`Working with repository at: ${repoPath}`);

    // Make sure the repo directory exists
    try {
      await fs.mkdir(repoPath, { recursive: true });
      console.log(`Repository directory created/verified: ${repoPath}`);
    } catch (dirErr) {
      console.error(`Error creating repo directory: ${dirErr}`);
      return res.status(500).json({
        message: `Failed to create repository directory: ${dirErr.message}`,
      });
    }

    // Check if Git is installed and available
    try {
      const git = simpleGit();
      const version = await git.version();
      console.log(`Git version: ${version}`);
    } catch (gitErr) {
      console.error("Git not available:", gitErr);
      return res.status(500).json({
        message: "Git is not installed or not available to the server process",
      });
    }

    // Initialize repository with better error handling
    let git;
    try {
      git = simpleGit(repoPath);

      // Check if it's a valid git repo
      const isRepo = await git.checkIsRepo().catch(() => false);
      if (!isRepo) {
        console.log("Initializing new Git repository");
        await git.init();
      }
    } catch (initErr) {
      console.error("Failed to initialize Git repository:", initErr);
      return res.status(500).json({
        message: `Failed to initialize Git repository: ${initErr.message}`,
      });
    }

    // Configure remote with better error handling
    try {
      if (folder.githubRepo?.fullName) {
        const remoteUrl = `https://oauth2:${token}@github.com/${folder.githubRepo.fullName}.git`;

        // Check if remote exists
        const remotes = await git.getRemotes();
        if (!remotes.find((remote) => remote.name === "origin")) {
          console.log(`Adding remote: origin -> ${folder.githubRepo.fullName}`);
          await git.addRemote("origin", remoteUrl);
        } else {
          console.log("Remote 'origin' already exists");
          // Update the remote URL to ensure it has the current token
          try {
            await git.remote(["set-url", "origin", remoteUrl]);
            console.log("Updated remote URL with current token");
          } catch (remoteUpdateErr) {
            console.error("Error updating remote URL:", remoteUpdateErr);
          }
        }
      } else {
        console.error("Missing GitHub repository information in folder");
        return res
          .status(400)
          .json({ message: "Missing GitHub repository information" });
      }
    } catch (remoteErr) {
      console.error("Error configuring remote:", remoteErr);
      return res
        .status(500)
        .json({ message: `Failed to configure remote: ${remoteErr.message}` });
    }

    // Configure Git user with better error handling
    try {
      console.log("Configuring Git user");
      await git.addConfig(
        "user.name",
        req.user.username || "Collaborative Editor User"
      );
      await git.addConfig(
        "user.email",
        req.user.email || "user@collaborative-editor.com"
      );
      console.log("Git user configured");
    } catch (configErr) {
      console.error("Failed to configure Git user:", configErr);
      return res.status(500).json({
        message: `Failed to configure Git user: ${configErr.message}`,
      });
    }

    // Write files to repo with better error handling
    try {
      console.log(`Writing ${files?.length} files to repository`);
      for (const file of files) {
        if (!file.path || file.content === undefined) {
          console.warn("Invalid file object:", file);
          continue;
        }

        const filePath = path.join(repoPath, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content || "");
        console.log(`Written file: ${file.path}`);
      }
    } catch (fileErr) {
      console.error("Failed to write files:", fileErr);
      return res.status(500).json({
        message: `Failed to write files to repository: ${fileErr.message}`,
      });
    }

    // Add files to staging with better error handling
    try {
      console.log("Adding files to Git staging");
      await git.add(".");
    } catch (addErr) {
      console.error("Failed to stage files:", addErr);
      return res
        .status(500)
        .json({ message: `Failed to stage files: ${addErr.message}` });
    }

    // Check status before committing
    try {
      const status = await git.status();
      console.log("Git status before commit:", status);

      if (status.files.length === 0) {
        console.log("No changes to commit");
        return res.json({ message: "No changes to commit", noChanges: true });
      }
    } catch (statusErr) {
      console.error("Failed to check Git status:", statusErr);
      // Continue anyway - not a fatal error
    }

    // Commit changes with better error handling
    let commitResult;
    try {
      console.log(`Committing with message: ${message}`);
      commitResult = await git.commit(message);
      console.log("Commit successful:", commitResult);
    } catch (commitErr) {
      console.error("Failed to commit changes:", commitErr);
      return res
        .status(500)
        .json({ message: `Failed to commit changes: ${commitErr.message}` });
    }

    // Push changes with better error handling
    try {
      console.log(`Pushing to ${folder.githubRepo.fullName}`);
      const remoteUrl = `https://oauth2:${token}@github.com/${folder.githubRepo.fullName}.git`;

      try {
        console.log("Attempting push...");
        await git.push("origin", folder.githubRepo.defaultBranch || "main");
        console.log("Push successful");
      } catch (pushErr) {
        console.log("Initial push failed:", pushErr.message);

        if (pushErr.message.includes("no upstream")) {
          console.log("Setting upstream for push");
          await git.push([
            "--set-upstream",
            "origin",
            folder.githubRepo.defaultBranch || "main",
          ]);
          console.log("Push with upstream successful");
        } else {
          console.log("Trying pull before push");
          try {
            await git.pull("origin", folder.githubRepo.defaultBranch || "main");
            await git.push();
            console.log("Pull and push successful");
          } catch (pullPushErr) {
            console.error("Pull and push failed:", pullPushErr);
            throw pullPushErr;
          }
        }
      }

      // Update last synced timestamp
      folder.githubRepo.lastSynced = new Date();
      await folder.save();
    } catch (pushErr) {
      console.error("Failed to push changes:", pushErr);
      // Return a more user-friendly message for common issues
      if (pushErr.message?.includes("Authentication failed")) {
        return res.status(401).json({
          message: "GitHub authentication failed. Your token may have expired.",
        });
      } else if (pushErr.message?.includes("403")) {
        return res.status(403).json({
          message:
            "Permission denied when pushing to GitHub. Check repository permissions.",
        });
      }
      return res
        .status(500)
        .json({ message: `Failed to push changes: ${pushErr.message}` });
    }

    console.log("Commit and push successful");
    res.json({
      message: "Changes committed and pushed successfully",
      commit: commitResult,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("💥 Error in commitChanges:", error);
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
      command: error.git?.command || null,
      failed: error.git?.failed || null,
      errorCode: error.code,
      gitMessage: error.git?.message,
    });
  }
};

// Fix the getStatus function to ensure Git only sees files in the repo directory
export const getStatus = async (req, res) => {
  const originalDir = process.cwd();
  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check if repository is initialized
    // If folder.githubRepo is missing, this is a new project without a repository
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
    console.log(`Using isolated repository path: ${repoPath}`);

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

      // CRITICAL FIX: Use process.chdir to change working directory
      process.chdir(repoPath);
      console.log("Changed working directory to:", repoPath);

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
        console.log(`Initialized new Git repository at ${repoPath}`);

        // Set up remote if we have repo info
        if (folder.githubRepo?.fullName) {
          const token = req.headers.authorization?.split(" ")[1];
          if (token) {
            const remoteUrl = `https://oauth2:${token}@github.com/${folder.githubRepo.fullName}.git`;
            try {
              await git.addRemote("origin", remoteUrl);
            } catch (e) {
              // Remote might already exist
            }
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
        console.log(`📝 Syncing database content to repository files...`);
        const documents = await Document.find({ folder: folderId });
        console.log(`📄 Found ${documents.length} documents to sync`);

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
            if (fileChanged) {
              console.log(`🔄 Content changed for ${doc.title}`);
            }
          } catch (err) {
            console.log(`🆕 New file: ${doc.title}`);
          }

          // Write the database content to the actual file
          if (fileChanged || !doc.content) {
            await fs.writeFile(filePath, doc.content || "");
            console.log(`✏️ Updated file: ${filePath}`);
          }
        }
      } catch (syncErr) {
        console.error(`❌ Auto-sync error: ${syncErr.message}`);
        // Continue even if sync fails - we still want to return status
      }

      // Force git to recognize the changes
      await git.add("--intent-to-add", ".");

      // IMPORTANT: Get status with restricted search paths
      // This prevents Git from detecting files outside the repo directory
      const status = await git.status(["."]);
      console.log(`📊 Git status result for project folder only:`, status);

      // Clean up temp config
      try {
        await fs.unlink(gitConfigPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      // IMPORTANT: Change directory back to original
      process.chdir(originalDir);

      res.json(status);
    } catch (err) {
      // Make sure we change back to the original directory
      process.chdir(originalDir);
      console.error("Error in getStatus:", err);
      res.status(500).json({ message: err.message });
    }
  } catch (error) {
    // Safety measure - ensure we always restore directory
    process.chdir(originalDir);
    console.error("Error in getStatus:", error);
    res.status(500).json({ message: error.message });
  }
};

export const initializeRepository = async (req, res) => {
  const originalDir = process.cwd();

  try {
    const { folderId } = req.params;
    const {
      isPrivate = false,
      addReadme = true,
      defaultBranch = "main",
    } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "GitHub token is required" });
    }

    console.log(`Initializing repository for folder: ${folderId}`);
    console.log(`Options:`, req.body);

    // Find the folder
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check if folder has a GitHub repo connected
    if (!folder.githubRepo || !folder.githubRepo.fullName) {
      return res.status(404).json({
        message:
          "No GitHub repository connected to this folder. Please create a repository first.",
      });
    }

    // Setup the repository path
    const repoPath = path.join(REPOS_DIR, folderId.toString());
    console.log(`Repository path: ${repoPath}`);

    try {
      // Ensure directory exists
      await fs.mkdir(repoPath, { recursive: true });
      console.log("Repository directory created/verified");

      // Switch to repository directory
      process.chdir(repoPath);
      console.log(`Changed working directory to: ${repoPath}`);

      // Initialize git repository with proper isolation
      const git = simpleGit({
        baseDir: repoPath,
        binary: "git",
      });

      // Check if it's a valid git repo
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

      // Set remote URL
      const remoteUrl = `https://oauth2:${token}@github.com/${folder.githubRepo.fullName}.git`;
      console.log(`Setting up remote for: ${folder.githubRepo.fullName}`);

      // Check if remote exists
      const remotes = await git.getRemotes();
      if (!remotes.find((remote) => remote.name === "origin")) {
        console.log("Adding remote 'origin'");
        await git.addRemote("origin", remoteUrl);
      } else {
        console.log("Updating remote 'origin' URL");
        await git.remote(["set-url", "origin", remoteUrl]);
      }

      // Create README if requested
      if (addReadme) {
        console.log("Creating README.md");
        const readmeContent = `# ${folder.name}\n\nThis repository was created with DevUnity Collaborative Code Editor.`;
        await fs.writeFile(path.join(repoPath, "README.md"), readmeContent);
      }

      // Stage all files
      console.log("Staging files");
      await git.add(".");

      // Check if there are changes to commit
      const status = await git.status();
      console.log("Git status:", JSON.stringify(status, null, 2));

      if (status.files.length > 0) {
        // Commit changes
        console.log("Committing changes");
        await git.commit("Initial commit");
      } else {
        console.log("No changes to commit");
      }

      // Try to pull first (this might fail for new repos, which is fine)
      try {
        console.log(`Pulling from origin/${defaultBranch}`);
        await git.pull("origin", defaultBranch).catch(() => {
          console.log(`Pull failed - this is normal for new repositories`);
        });
      } catch (pullErr) {
        console.log("Pull error (expected for new repos):", pullErr.message);
      }

      // Push changes
      try {
        console.log(`Pushing to origin/${defaultBranch}`);
        await git.push(["-u", "origin", defaultBranch]);
        console.log("Push successful");
      } catch (pushErr) {
        console.log("Push error:", pushErr.message);

        // If push fails with specific errors, try force push
        if (
          pushErr.message?.includes("rejected") ||
          pushErr.message?.includes("not-fast-forward")
        ) {
          console.log("Attempting force push");
          await git.push(["-u", "-f", "origin", defaultBranch]);
          console.log("Force push successful");
        } else {
          throw pushErr;
        }
      }

      // Mark repository as initialized in database
      console.log("Updating folder in database");
      folder.githubRepo.isInitialized = true;
      folder.githubRepo.defaultBranch = defaultBranch;
      folder.githubRepo.lastSynced = new Date();
      await folder.save();

      // Change back to original directory
      process.chdir(originalDir);
      console.log("Changed back to original directory");

      // Get updated status
      const updatedStatus = await git.status();

      // Return success with repository information
      res.json({
        message: "Repository initialized successfully",
        repository: folder.githubRepo,
        status: {
          ...updatedStatus,
          isGitRepo: true,
          needsInitialization: false,
        },
      });
    } catch (gitErr) {
      // Change back to original directory in case of error
      try {
        process.chdir(originalDir);
      } catch (cdErr) {
        // Ignore directory change errors
      }

      console.error("Git operation error:", gitErr);
      return res.status(500).json({
        message: `Git operation failed: ${gitErr.message}`,
        command: gitErr.git?.command,
        error: gitErr.message,
        stack: process.env.NODE_ENV === "production" ? undefined : gitErr.stack,
      });
    }
  } catch (error) {
    // Make sure we change back to original directory
    try {
      process.chdir(originalDir);
    } catch (cdErr) {
      // Ignore directory change errors
    }

    console.error("Server error in initializeRepository:", error);
    res.status(500).json({
      message: "Failed to initialize repository",
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
  }
};

// Add this function to github.controller.js
export const syncFilesToRepo = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { files } = req.body;

    const folder = await Folder.findById(folderId);
    if (!folder || !folder.githubRepo) {
      return res
        .status(404)
        .json({ message: "Folder with GitHub repository not found" });
    }

    const repoPath = path.join(REPOS_DIR, folderId.toString());
    console.log(`🔄 Syncing files to repository: ${repoPath}`);

    // Ensure directory exists
    await fs.mkdir(repoPath, { recursive: true });

    let changedFiles = 0;
    // Write all files to the repo directory
    for (const file of files) {
      const filePath = path.join(repoPath, file.path);

      // Create directories if needed
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Check if content is different
      let contentDifferent = true;
      try {
        const existingContent = await fs.readFile(filePath, "utf8");
        contentDifferent = existingContent !== file.content;
      } catch (err) {
        // File doesn't exist, so it's definitely different
      }

      if (contentDifferent) {
        // Write file content
        await fs.writeFile(filePath, file.content);
        console.log(`✏️ Updated file: ${file.path}`);
        changedFiles++;
      }
    }

    // Force git to see the changes
    const git = simpleGit(repoPath);
    await git.add("--intent-to-add", ".");

    res.json({
      message: "Files synced to repository successfully",
      changedFiles,
      repoPath,
    });
  } catch (error) {
    console.error("Error syncing files to repository:", error);
    res.status(500).json({ message: error.message, stack: error.stack });
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
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No GitHub token provided" });
    }

    // Test token by making a simple GitHub API call
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      return res.status(401).json({
        message: "Invalid GitHub token",
        githubStatus: response.status,
      });
    }

    const userData = await response.json();

    res.json({
      valid: true,
      user: {
        login: userData.login,
        id: userData.id,
        avatar_url: userData.avatar_url,
      },
    });
  } catch (error) {
    console.error("Error verifying GitHub token:", error);
    res.status(500).json({ message: error.message });
  }
};
