import axios from 'axios';
import React, {useState} from 'react';
import SessionExpiredModal from './components/SendMessageModal.jsx';
import {useNavigate} from "react-router-dom"; // Импортируйте модальное окно

// Устанавливаем базовый URL для всех запросов
const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/',
});

export const useApi = () => {
    const [isSessionExpired, setIsSessionExpired] = useState(false); // Состояние для модального окна

    // Перехватчик для автоматического добавления токена авторизации в заголовки
    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Перехватчик для обработки 401 ошибки и автоматического обновления токена
    api.interceptors.response.use(
        (response) => {
            return response;
        },
        async (error) => {
            const originalRequest = error.config;

            // Если токен истек и это не повторный запрос
            if (error.response && error.response.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                // Получаем refresh-токен
                const refreshToken = localStorage.getItem('refresh_token');

                if (refreshToken) {
                    try {
                        // Запрашиваем новый access-токен с помощью refresh-токена
                        const {data} = await api.post('token/refresh/', {refresh: refreshToken});

                        // Сохраняем новый access-токен
                        localStorage.setItem('access_token', data.access);

                        // Обновляем заголовок запроса с новым токеном
                        originalRequest.headers.Authorization = `Bearer ${data.access}`;

                        // Повторяем оригинальный запрос с новым токеном
                        return api(originalRequest);
                    } catch (err) {
                        setIsSessionExpired(true); // Показываем модальное окно при неудаче
                    }
                } else {
                    const navigate = useNavigate();
                    navigate("/"); // Перенаправление на страницу логина
                    setIsSessionExpired(true); // Показываем модальное окно при отсутствии refresh-токена
                }
            }

            return Promise.reject(error);
        }
    );

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';  // Перенаправление на страницу логина
    };

    return {isSessionExpired, handleLogout};
};


export const refreshToken = (data) => {
    return api.post('token/refresh/', data);
};

// Orders API
export const getOrders = () => {
    return api.get('orders/');
};

export const getOrderById = (orderId) => {
    return api.get(`orders/${orderId}/`);
};

export const createOrder = (data) => {
    return api.post('orders/', data);
};

export const updateOrder = (orderId, data) => {
    return api.put(`orders/${orderId}/`, data);
};

export const getServices = () => {
    return api.get('services/'); // Замените 'services/' на правильный путь API для получения услуг
};

export const deleteOrder = (orderId) => {
    return api.delete(`orders/${orderId}/`);
};

// Clients API
export const getClients = () => {
    return api.get('clients/');
};

export const getClientById = (clientId) => {
    return api.get(`clients/${clientId}/`);
};

export const createClient = (data) => {
    return api.post('clients/', data);
};

export const updateClient = (clientId, data) => {
    return api.put(`clients/${clientId}/`, data);
};

export const deleteClient = (clientId) => {
    return api.delete(`clients/${clientId}/`);
};

// Events API
export const getEvents = () => {
    return api.get('events/');
};

export const getEventById = (eventId) => {
    return api.get(`events/${eventId}/`);
};

export const createEvent = (data) => {
    return api.post('events/', data);
};

export const updateEvent = (eventId, data) => {
    return api.put(`events/${eventId}/`, data);
};

export const deleteEvent = (eventId) => {
    return api.delete(`events/${eventId}/`);
};

// Workers API
export const getWorkers = () => {
    return api.get('workers/');
};

export const getWorkerById = (workerId) => {
    return api.get(`workers/${workerId}/`);
};

export const createWorker = (data) => {
    return api.post('workers/', data);
};

export const updateWorker = (workerId, data) => {
    return api.put(`workers/${workerId}/`, data);
};

export const deleteWorker = (workerId) => {
    return api.delete(`workers/${workerId}/`);
};

// SMS API
export const sendSMS = (data) => {
    return api.post('sms/', data);
};

export default api;
