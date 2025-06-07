import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import {
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiSettings,
  FiMail,
  FiChevronLeft,
} from "react-icons/fi";
import logo from "../../assets/newlogo.png";
import api from "../../lib/api";
import UserInvitations from "../collaboration/UserInvitations";

export default function Navbar({ children, showBackButton, title, actions }) {
  const { currentuser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);

  // Check if we're on the landing page
  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    const fetchInvitationCount = async () => {
      try {
        const { data } = await api.get("/api/users/invitations/count");
        setInvitationCount(data.count);
      } catch (err) {
        console.error("Failed to fetch invitation count", err);
      }
    };

    if (currentuser) {
      fetchInvitationCount();
      const interval = setInterval(fetchInvitationCount, 60000);
      return () => clearInterval(interval);
    }
  }, [currentuser]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

 
  if (isLandingPage && !currentuser) {
    return (
      <header className="bg-transparent py-4 px-6 relative z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="DevUnity" className="h-8 mr-2" />
            <h1 className="text-white text-xl font-bold">DevUnity</h1>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-white hover:text-blue-300 transition"
            >
              Features
            </a>
            <a
              href="#testimonials"
              className="text-white hover:text-blue-300 transition"
            >
              Testimonials
            </a>
            <a
              href="#pricing"
              className="text-white hover:text-blue-300 transition"
            >
              Pricing
            </a>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="text-white hover:text-blue-300 transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
            >
              Get Started
            </Link>
          </div>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-slate-800 py-4 px-6 flex flex-col space-y-4 border-t border-slate-700">
            <a
              href="#features"
              className="text-white hover:text-blue-300 transition"
            >
              Features
            </a>
            <a
              href="#testimonials"
              className="text-white hover:text-blue-300 transition"
            >
              Testimonials
            </a>
            <a
              href="#pricing"
              className="text-white hover:text-blue-300 transition"
            >
              Pricing
            </a>
            <div className="border-t border-slate-700 pt-4 flex flex-col space-y-4">
              <Link
                to="/login"
                className="text-white hover:text-blue-300 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>
    );
  }

  // Default authenticated navbar
  return (
    <header className="bg-slate-800 border-b border-slate-700 py-2 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <FiChevronLeft size={24} />
            </button>
          )}

          <div className="flex items-center">
            <img src={logo} alt="DevUnity" className="h-6 mr-2" />
            <h1 className="text-white font-medium truncate max-w-md">
              {title || "DevUnity"}
            </h1>
          </div>

          {children}
        </div>

        <div className="flex items-center space-x-2">
          {actions}

          {/* Only show invitations for authenticated users */}
          {currentuser && invitationCount > 0 && (
            <button
              onClick={() => setInvitationsOpen(!invitationsOpen)}
              className="relative p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <FiMail size={20} />
              <span className="absolute top-0 right-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {invitationCount}
              </span>
            </button>
          )}

          {/* Profile button for authenticated users */}
          {currentuser && (
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center focus:outline-none"
              >
                <div className="w-8 h-8 overflow-hidden rounded-full bg-blue-600 flex items-center justify-center">
                  {currentuser?.avatar ? (
                    <img
                      src={currentuser.avatar}
                      alt={currentuser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {currentuser?.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-md shadow-lg z-10 border border-slate-700">
                  <div className="p-3 border-b border-slate-700">
                    <p className="text-white font-medium">
                      {currentuser?.username}
                    </p>
                    <p className="text-slate-400 text-sm truncate">
                      {currentuser?.email}
                    </p>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/profile"
                      className="flex items-center px-3 py-2 rounded-md text-white hover:bg-slate-700"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <FiUser className="mr-2" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-3 py-2 rounded-md text-white hover:bg-slate-700"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <FiSettings className="mr-2" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-3 py-2 rounded-md text-white hover:bg-slate-700"
                    >
                      <FiLogOut className="mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Login/Register buttons for non-authenticated users who aren't on landing page */}
          {!currentuser && !isLandingPage && (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="text-white hover:text-blue-300 px-3 py-1"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
              >
                Register
              </Link>
            </div>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 md:hidden"
          >
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {invitationsOpen && currentuser && (
        <UserInvitations onClose={() => setInvitationsOpen(false)} />
      )}

      {/* Mobile menu for authenticated pages */}
      {isMobileMenuOpen && !isLandingPage && (
        <div className="md:hidden mt-2 bg-slate-800 rounded-md border border-slate-700 p-2 space-y-2">
          <Link
            to="/dashboard"
            className="block px-3 py-2 rounded-md text-white hover:bg-slate-700"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            to="/profile"
            className="block px-3 py-2 rounded-md text-white hover:bg-slate-700"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Profile
          </Link>
          {currentuser && (
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-md text-white hover:bg-slate-700"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
