import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiSettings,
  FiMail,
  FiChevronLeft,
  FiBell,
  FiHome,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthProvider";
import api from "../../lib/api";
import UserInvitations from "../collaboration/UserInvitations";
import logo from "../../assets/newlogo.png";

export default function Navbar({ children, showBackButton, title, actions }) {
  const { currentuser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const userMenuRef = useRef(null);

  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    const fetchInvitationCount = async () => {
      try {
        // Check if the user is still authenticated
        if (!currentuser?.token) {
          return;
        }

        const { data } = await api.get("/api/users/invitations/count");
        setInvitationCount(data.count);
      } catch (err) {
        // Don't log errors if they're 401 (expected when not logged in)
        if (err.response && err.response.status !== 401) {
          console.error("Failed to fetch invitation count", err);
        }
        setInvitationCount(0);
      }
    };

    if (currentuser) {
      fetchInvitationCount();
      const interval = setInterval(fetchInvitationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentuser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Landing page navbar (for unauthenticated users)
  if (isLandingPage && !currentuser) {
    return (
      <header className="bg-transparent py-5 px-6 relative z-20">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="DevUnity" className="h-8 mr-3" />
            <h1 className="text-white text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              DevUnity
            </h1>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-10">
            <a
              href="#features"
              className="text-slate-300 hover:text-white transition-colors duration-300 text-sm font-medium"
            >
              Features
            </a>
            <a
              href="#testimonials"
              className="text-slate-300 hover:text-white transition-colors duration-300 text-sm font-medium"
            >
              Testimonials
            </a>
            <a
              href="#pricing"
              className="text-slate-300 hover:text-white transition-colors duration-300 text-sm font-medium"
            >
              Pricing
            </a>
          </div>

          <div className="flex items-center space-x-5">
            <Link
              to="/login"
              className="text-slate-200 hover:text-white transition-colors duration-300 font-medium"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-md transition-all duration-300 shadow-lg shadow-blue-500/20 font-medium"
            >
              Get Started
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-md text-white bg-slate-800/30 backdrop-blur-sm border border-slate-700/30"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 mt-2 mx-4 rounded-lg bg-slate-800/80 backdrop-blur-md py-4 px-6 flex flex-col space-y-4 border border-slate-700/50 shadow-xl z-50">
            <a
              href="#features"
              className="text-white hover:text-blue-300 transition py-2 border-b border-slate-700/50"
            >
              Features
            </a>
            <a
              href="#testimonials"
              className="text-white hover:text-blue-300 transition py-2 border-b border-slate-700/50"
            >
              Testimonials
            </a>
            <a
              href="#pricing"
              className="text-white hover:text-blue-300 transition py-2 border-b border-slate-700/50"
            >
              Pricing
            </a>
            <div className="pt-2 flex flex-col space-y-4">
              <Link
                to="/login"
                className="text-white hover:text-blue-300 transition px-4 py-2"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-3 rounded-md transition text-center font-medium shadow-lg shadow-blue-500/20"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>
    );
  }

  // Main navbar - now with landing page aesthetics applied for all other cases
  return (
    <header className="bg-black/60 backdrop-blur-md border-b border-slate-700/30 py-3 px-6 relative z-20">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="text-slate-300 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800/50"
            >
              <FiChevronLeft size={22} />
            </button>
          )}

          <div className="flex items-center">
            <img src={logo} alt="DevUnity" className="h-8 mr-3" />
            <h1 className="text-white text-lg font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              {title || "DevUnity"}
            </h1>
          </div>

          {children}
        </div>

        <div className="flex items-center space-x-3">
          {actions}
          {currentuser && invitationCount > 0 && (
            <button
              onClick={() => setInvitationsOpen(!invitationsOpen)}
              className="relative p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
            >
              <FiMail size={20} />
              <span className="absolute top-0 right-0 w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20">
                {invitationCount}
              </span>
            </button>
          )}

          {currentuser && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 focus:outline-none rounded-full p-1 hover:bg-slate-800/50 transition-colors"
              >
                {currentuser?.avatar ? (
                  <img
                    src={currentuser.avatar}
                    alt={currentuser.username}
                    className="w-8 h-8 rounded-full border-2 border-slate-700/60 shadow-md"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-md shadow-blue-900/20">
                    {currentuser?.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="text-white hidden sm:inline font-medium">
                  {currentuser?.username || "Guest"}
                </span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-800/90 backdrop-blur-sm border border-slate-700/60 rounded-lg shadow-2xl py-1 z-50">
                  <Link
                    to="/dashboard"
                    className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-600/20 hover:text-white transition-all"
                  >
                    <FiHome className="inline mr-2" /> Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-600/20 hover:text-white transition-all"
                  >
                    <FiUser className="inline mr-2" /> Profile
                  </Link>
                  <div className="border-t border-slate-700/50 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-600/20 hover:text-white transition-all"
                  >
                    <FiLogOut className="inline mr-2" /> Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {!currentuser && !isLandingPage && (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-slate-200 hover:text-white transition-colors duration-300 font-medium px-3 py-1.5"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-1.5 rounded-md transition-all duration-300 shadow-lg shadow-blue-500/20 font-medium"
              >
                Register
              </Link>
            </div>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-slate-300 hover:text-white bg-slate-800/30 hover:bg-slate-700/60 backdrop-blur-sm border border-slate-700/30 md:hidden"
          >
            {isMobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {invitationsOpen && currentuser && (
        <UserInvitations onClose={() => setInvitationsOpen(false)} />
      )}

      {isMobileMenuOpen && !isLandingPage && (
        <div className="md:hidden absolute left-0 right-0 mt-2 mx-4 bg-slate-800/90 backdrop-blur-sm rounded-lg py-4 border border-slate-700/60 shadow-2xl z-50">
          <Link
            to="/dashboard"
            className="block px-6 py-2.5 text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-600/20 transition-all"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FiHome className="inline mr-2" /> Dashboard
          </Link>
          <Link
            to="/profile"
            className="block px-6 py-2.5 text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-600/20 transition-all"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FiUser className="inline mr-2" /> Profile
          </Link>
          {currentuser && (
            <button
              onClick={handleLogout}
              className="w-full text-left px-6 py-2.5 text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-600/20 transition-all"
            >
              <FiLogOut className="inline mr-2" /> Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
