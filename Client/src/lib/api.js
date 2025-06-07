import axios from "axios";

const API_URL = "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
    }
    return Promise.reject(error);
  }
);

export const completeOnboarding = async (preferences) => {
  try {
    const response = await api.post("/api/users/onboarding", preferences);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to complete onboarding" };
  }
};

export default api;
