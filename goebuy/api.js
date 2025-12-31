import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ✅ Troque aqui apenas quando mudar o IP
export const API_URL = 'http://192.168.1.10:5000/api';

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

