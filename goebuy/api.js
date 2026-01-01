import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ✅ URL da API em produção (Render)
export const API_URL = 'https://go-and-buy.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// token 

// 🔹 Interceptor para adicionar token automaticamente
const token = await AsyncStorage.getItem("token");
        if (!token) return console.warn("Token não encontrado.");
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

