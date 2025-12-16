/**
 * Утилита для debounce функции
 * @param {Function} func - Функция для debounce
 * @param {number} wait - Время задержки в миллисекундах
 * @returns {Function} - Debounced функция
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

import { useState, useEffect } from 'react';

/**
 * React hook для debounce значения
 * @param {any} value - Значение для debounce
 * @param {number} delay - Задержка в миллисекундах
 * @returns {any} - Debounced значение
 */
export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

