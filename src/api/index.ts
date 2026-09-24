import axios from "axios";
import { authService } from "./auth/AuthService";
import { useUserStore } from "@/stores/user";

const API_HOST = import.meta.env.VITE_API_HOST;

export const httpClient = axios.create({
  baseURL: `${API_HOST}`,
  withCredentials: true,
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue: any[] = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom: any) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// Request interceptor
httpClient.interceptors.request.use(
  (config) => {
    const storedLanguage = typeof window !== 'undefined'
      ? window.localStorage.getItem('user-language')
      : null
    const normalizedLanguage = storedLanguage?.toLowerCase().startsWith('ru') ? 'ru' : 'en'

    config.headers = config.headers ?? {}
    if (!config.headers['Accept-Language']) {
      config.headers['Accept-Language'] = normalizedLanguage
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status } = error.response;

    if (status === 404) {
      console.error("ошибка 404");
    }

    if (status === 500) {
      console.error("Внутренняя ошибка сервера");
    }

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return httpClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshed = await authService.refreshTokens();
        if (refreshed) {
          return httpClient(originalRequest);
        } else {
          processQueue(error, null);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(error, null);
        await useUserStore().clearUser();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
