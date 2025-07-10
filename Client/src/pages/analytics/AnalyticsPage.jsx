import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiActivity,
  FiFileText,
  FiEdit,
  FiUsers,
  FiCalendar,
  FiClock,
  FiInfo,
} from "react-icons/fi";
import api from "../../lib/api.js";
import Navbar from "../../components/layout/NavBar";

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch analytics data from the existing endpoint
        const response = await api.get("/api/analytics/usage");
        setAnalyticsData(response.data);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        setError("Failed to load analytics data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // Format date to readable string
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <div
          className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15), rgba(0, 0, 0, 0) 70%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15), rgba(0, 0, 0, 0) 70%)",
            zIndex: 0,
          }}
          aria-hidden="true"
        ></div>

        <div className="flex flex-col items-center z-10">
          <motion.div
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          ></motion.div>
          <motion.p
            className="mt-6 text-slate-300 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Loading analytics data...
          </motion.p>
        </div>
      </div>
    );
  }

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
        title="Activity Analytics"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4"
            >
              <p className="text-red-400 flex items-center">
                <FiInfo className="mr-2" /> {error}
              </p>
            </motion.div>
          )}

          {/* Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl shadow-2xl overflow-hidden mb-8 border border-blue-900/20 backdrop-blur-sm"
          >
            <div className="px-6 py-8 sm:p-10">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <FiActivity className="text-blue-400" /> Activity Overview
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Documents Created */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-900/50 flex items-center justify-center text-blue-400">
                      <FiFileText size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">
                        Documents Created
                      </p>
                      <p className="text-2xl font-semibold text-white">
                        {analyticsData?.documentsCreated || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documents Edited */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-900/50 flex items-center justify-center text-purple-400">
                      <FiEdit size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Documents Edited</p>
                      <p className="text-2xl font-semibold text-white">
                        {analyticsData?.documentsEdited || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-green-900/50 flex items-center justify-center text-green-400">
                      <FiClock size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">
                        Actions (Last 30 Days)
                      </p>
                      <p className="text-2xl font-semibold text-white">
                        {analyticsData?.recentActivity || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Activity by Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden backdrop-blur-sm mb-8"
          >
            <div className="px-6 py-5 bg-slate-800/70 border-b border-slate-700/70">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <FiActivity className="text-purple-400" /> Activity Breakdown
              </h3>
            </div>
            <div className="p-6">
              {analyticsData?.activityByType &&
              Object.entries(analyticsData.activityByType).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(analyticsData.activityByType).map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-4 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400">
                            {type === "edit" && <FiEdit />}
                            {type === "view" && <FiFileText />}
                            {type === "create" && <FiFileText />}
                            {type === "share" && <FiUsers />}
                            {type === "other" && <FiActivity />}
                          </div>
                          <span className="text-white capitalize">{type}</span>
                        </div>
                        <span className="text-2xl font-semibold text-white">
                          {count}
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">No activity data available.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity Log */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden backdrop-blur-sm"
          >
            <div className="px-6 py-5 bg-slate-800/70 border-b border-slate-700/70">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <FiCalendar className="text-blue-400" /> Recent Activities
              </h3>
            </div>
            <div className="p-6">
              {analyticsData?.recentActivities &&
              analyticsData.recentActivities.length > 0 ? (
                <div className="divide-y divide-slate-700/50">
                  {analyticsData.recentActivities.map((activity, index) => (
                    <div key={index} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400">
                            {activity.action === "edit" && (
                              <FiEdit className="text-blue-400" />
                            )}
                            {activity.action === "view" && (
                              <FiFileText className="text-green-400" />
                            )}
                            {activity.action === "create" && (
                              <FiFileText className="text-purple-400" />
                            )}
                            {activity.action === "share" && (
                              <FiUsers className="text-amber-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white">
                              <span className="capitalize">
                                {activity.action}
                              </span>
                              : {activity.document?.title || "Unknown Document"}
                            </p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                              <FiClock size={12} />{" "}
                              {formatDate(activity.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/documents/${activity.document?._id}`}
                          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-md transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">
                    No recent activities to display.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
