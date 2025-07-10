import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiUser,
  FiMail,
  FiEdit2,
  FiSave,
  FiTrash2,
  FiAlertTriangle,
  FiX,
  FiArrowLeft,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthProvider";
import Navbar from "../../components/layout/NavBar";
import api from "../../lib/api.js";

export default function ProfilePage() {
  const { currentuser, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    username: "",
    email: "",
    bio: "",
    avatar: "",
    preferredLanguages: [],
  });

  useEffect(() => {
    if (currentuser) {
      setProfileData({
        username: currentuser.username || "",
        email: currentuser.email || "",
        bio: currentuser.bio || "",
        avatar: currentuser.avatar || "",
        preferredLanguages: currentuser.preferredLanguages || [],
      });
    }
  }, [currentuser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5000000) {
      setError("Image too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        setProfileData((prev) => ({
          ...prev,
          avatar: canvas.toDataURL("image/jpeg", 0.7),
        }));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.put(`/api/users/${currentuser._id}`, profileData);
      setSuccess("Profile updated successfully!");

      // Force reload of user data by logging out and back in
      // In a real app, you might want a more elegant solution
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await api.delete(`/api/users/${currentuser._id}`);
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Error deleting account:", err);
      setError(err.response?.data?.message || "Failed to delete account");
      setShowDeleteModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Background gradient effects */}
      <div
        className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15), rgba(0, 0, 0, 0) 70%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15), rgba(0, 0, 0, 0) 70%)",
          zIndex: 0,
        }}
        aria-hidden="true"
      ></div>

      <Navbar
        title="My Profile"
        showBackButton
        actions={
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-md text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-300 flex items-center gap-2"
          >
            <FiArrowLeft className="text-slate-400" /> Back to Dashboard
          </Link>
        }
      />

      <main className="py-8 flex-1 relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4"
            >
              <p className="text-red-400 flex items-center">
                <FiAlertTriangle className="mr-2" /> {error}
              </p>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-green-500/10 border border-green-500/50 rounded-lg p-4"
            >
              <p className="text-green-400 flex items-center">
                <FiSave className="mr-2" /> {success}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl shadow-2xl overflow-hidden border border-slate-700/50 backdrop-blur-sm"
          >
            <div className="px-6 py-8">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
                <FiUser className="mr-3 text-blue-400" /> Profile Settings
              </h2>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div
                    className="relative w-32 h-32 cursor-pointer group"
                    onClick={handleAvatarClick}
                  >
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-blue-500/50 bg-slate-700 flex items-center justify-center">
                      {profileData.avatar ? (
                        <img
                          src={profileData.avatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl text-slate-400">
                          {profileData.username?.charAt(0)?.toUpperCase() ||
                            "U"}
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                      <FiEdit2 className="text-white text-xl" />
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-medium text-white">
                      Profile Picture
                    </h3>
                    <p className="text-sm text-slate-400">
                      Click the avatar to upload a new image. Maximum file size
                      5MB.
                    </p>
                    <div className="text-sm text-blue-400">
                      Images will be resized to fit.
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-700/50 pt-8">
                  {/* Username Field */}
                  <div className="mb-6">
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      Username
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        value={profileData.username}
                        onChange={handleInputChange}
                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-slate-700/70 text-white text-sm"
                        placeholder="Your username"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="mb-6">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      Email
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={profileData.email}
                        onChange={handleInputChange}
                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-slate-700/70 text-white text-sm"
                        placeholder="Your email"
                      />
                    </div>
                  </div>

                  {/* Bio Field */}
                  <div className="mb-6">
                    <label
                      htmlFor="bio"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      value={profileData.bio}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-4 py-3 border border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-slate-700/70 text-white text-sm"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-md flex items-center gap-2 font-medium transition-all duration-300 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FiSave />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-8 bg-slate-800/50 rounded-xl shadow-2xl overflow-hidden border border-red-900/30 backdrop-blur-sm"
          >
            <div className="px-6 py-5 bg-red-950/20 border-b border-red-900/30">
              <h3 className="text-lg font-medium text-white flex items-center">
                <FiAlertTriangle className="mr-2 text-red-400" /> Danger Zone
              </h3>
            </div>
            <div className="p-6">
              <p className="text-slate-300 mb-6">
                Once you delete your account, there is no going back. Please be
                certain.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600/50 hover:bg-red-700/50 border border-red-700/50 text-white rounded-md flex items-center gap-2 transition-all duration-300"
              >
                <FiTrash2 />
                <span>Delete Account</span>
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <FiAlertTriangle className="mr-2 text-red-400" /> Delete Account
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <FiX size={20} />
              </button>
            </div>

            <p className="text-slate-300 mb-4">
              This action cannot be undone. All your data, documents, and files
              will be permanently deleted.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                To confirm, type your username:{" "}
                <span className="font-bold">{currentuser?.username}</span>
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-slate-700/70 text-white text-sm"
                placeholder={`Type ${currentuser?.username} to confirm`}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={
                  deleteConfirmation !== currentuser?.username || isLoading
                }
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
