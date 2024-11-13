import axios from "axios";

// Базовый URL для всех запросов
// const API_BASE_URL = "https://mukhammadrizo07.pythonanywhere.com/api";
const API_BASE_URL = "http://127.0.0.1:8000/api";


// Создаём экземпляр axios с базовой конфигурацией
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Добавляем интерцептор для добавления токена в заголовок запроса
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// User
export const login = (username, password) => api.post("/token/", {username, password});
export const getUsers = () => api.get("/users/");
export const getUser = userId => api.get(`/users/${userId}/`);
export const createUser = data => api.post("/users/", data);
export const updateUser = (id, data) => api.put(`/users/${id}/`, data);
export const deleteUser = id => api.delete(`/users/${id}/`);

// Clients
export const getClients = () => api.get("/clients/");
export const createClient = (data) => api.post("/clients/", data);
export const updateClient = (id, data) => api.put(`/clients/${id}/`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}/`);


export const getEvents = () => api.get("/events/");
export const getEventById = (id) => api.get(`/events/${id}/`);
export const createEvent = (data) => api.post("/events/", data);
export const updateEvent = (id, data) => api.put(`/events/${id}/`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}/`);

export const getWorkers = () => api.get("/workers/");
export const createWorker = (data) => api.post("/workers/", data);

export const getServices = () => api.get("/services/");
export const createService = (data) => api.post("/services/", data);

export default api;
