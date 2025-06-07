import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentuser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const { data } = await api.get("/api/auth/me");
          setCurrentUser({
            ...data,
            onboardingCompleted:
              data.onboardingCompleted === true ? true : false,
          });
        }
      } catch (error) {
        localStorage.removeItem("authToken");
        delete api.defaults.headers.common["Authorization"];
      } finally {
        setLoading(false);
      }
    };
    checkLoggedIn();
  }, []);

  const register = async (userData) => {
    try {
      const { data } = await api.post("/api/auth/register", userData);
      localStorage.setItem("authToken", data.token);
      api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      setCurrentUser(data);
      return data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  };

  const login = async (credentials) => {
    try {
      const { data } = await api.post("/api/auth/login", credentials);
      localStorage.setItem("authToken", data.token);
      api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      setCurrentUser({
        _id: data._id,
        username: data.username,
        avatar: data.avatar,
        onboardingCompleted: data.onboardingCompleted || false,
      });

      console.log(data);

      return data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("authToken");
      delete api.defaults.headers.common["Authorization"];
      setCurrentUser(null);
      navigate("/");
    }
  };

  const completeUserOnboarding = async (preferences) => {
    try {
      const response = await api.post("/api/users/onboarding", preferences);
      setCurrentUser({
        ...currentuser,
        ...response.data,
        onboardingCompleted: true,
      });
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Failed to complete onboarding" }
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentuser,
        loading,
        register,
        login,
        logout,
        completeUserOnboarding,
        isAuthenticated: !!currentuser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
