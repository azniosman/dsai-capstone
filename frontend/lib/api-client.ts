import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("profileId");
}

async function doRefresh(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await axios.post(
      `${api.defaults.baseURL}/api/auth/refresh`,
      { refresh_token: localStorage.getItem("refreshToken") },
      { timeout: 10000 }
    );
    const { access_token, refresh_token } = res.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("refreshToken", refresh_token);
    return access_token;
  } catch {
    clearAuth();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (typeof window === "undefined") return Promise.reject(error);

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refreshToken")
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      clearAuth();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
