import React, {useEffect, useState} from 'react';
import axios from '../api';
import {format} from 'date-fns';
import {ru} from 'date-fns/locale';

const AdvanceManager = ({ eventId, isOpen, onClose, onAdvanceUpdate }) => {
    const [advance, setAdvance] = useState(0); // Текущий аванс
    const [amount, setAmount] = useState(''); // Форматированное значение
    const [rawAmount, setRawAmount] = useState(''); // Необработанное значение
    const [changeType, setChangeType] = useState('add'); // Тип изменения
    const [history, setHistory] = useState([]); // История изменений

    // Функция форматирования числа с пробелами
    const formatNumber = (num) => {
        if (!num) return '';
        const parts = num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return parts.join(".");
    };

    // Функция форматирования даты
    const formatDate = (dateString) => {
        if (!dateString) return 'Дата отсутствует';
        const date = new Date(dateString);
        return format(date, "dd MMMM yyyy, HH:mm", {locale: ru});
    };

    // Загрузка данных аванса
    useEffect(() => {
        if (isOpen) {
            fetchAdvanceData();
        }
    }, [isOpen]);

    const fetchAdvanceData = async () => {
        try {
            const response = await axios.get(`/events/${eventId}/`);
            setAdvance(response.data.advance || 0); // Текущий аванс
            setHistory(response.data.advance_history || []); // История изменений
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            setHistory([]);
        }
    };

    // Обновление аванса
    const handleUpdateAdvance = async () => {
        try {
            const updatedAmount = parseFloat(rawAmount.replace(/\s/g, '') || 0); // Убираем пробелы
            const response = await axios.post(`/events/${eventId}/update_advance/`, {
                amount: updatedAmount,
                change_type: changeType,
            });

            // Обновляем аванс и добавляем новый элемент в историю
            setAdvance(response.data.advance);

            const newHistoryItem = {
                date: new Date().toISOString(), // Добавляем текущую дату
                change_type: changeType,
                amount: updatedAmount,
            };
            setHistory([newHistoryItem, ...history]); // Добавляем в начало списка

            // Сбрасываем поля ввода
            setAmount('');
            setRawAmount('');
            if (onAdvanceUpdate) {
                onAdvanceUpdate(response.data.advance);
            }
        } catch (error) {
            console.error('Ошибка при обновлении аванса:', error);
        }
    };

    // Обработчик изменения поля ввода
    const handleAmountChange = (e) => {
        const rawValue = e.target.value.replace(/\s/g, ''); // Убираем пробелы
        if (/^\d*$/.test(rawValue)) { // Только числа
            setRawAmount(rawValue); // Сохраняем необработанное значение
            setAmount(formatNumber(rawValue)); // Форматируем для отображения
        }
    };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50 ${isOpen ? 'visible' : 'hidden'}`}
        >
            <div className="bg-gray-800 text-black rounded-lg shadow-lg max-w-lg w-full overflow-hidden">
                {/* Заголовок */}
                <div className="p-6 border-b flex justify-between items-center bg-gray-800 text-white">
                    <h3 className="text-xl font-bold">Управление авансом</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-error">✕</button>
                </div>

                {/* Основная часть */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[400px]">
                    <h2 className="text-lg text-white font-bold">Текущий аванс: {formatNumber(advance)}</h2>
                    <div className="flex gap-4 items-center justify-center">
                        <input
                            type="text"
                            value={amount}
                            onChange={handleAmountChange}
                            className="input text-white bg-gray-800 input-bordered"
                            placeholder="Введите сумму"
                        />
                        <select
                            value={changeType}
                            onChange={(e) => setChangeType(e.target.value)}
                            className="border border-gray-700 text-white rounded-lg p-2 bg-gray-800"
                        >
                            <option value="add">Добавить</option>
                            <option value="subtract">Убрать</option>
                        </select>
                        <button
                            onClick={handleUpdateAdvance}
                            className="btn btn-sm btn-outline btn-accent"
                        >
                            Применить
                        </button>
                    </div>

                    {/* История изменений */}
                    <h3 className="text-lg text-white font-semibold mt-6">История изменений:</h3>
                    <ul className="mt-4 space-y-2 overflow-y-auto max-h-[150px] bg-gray-100 p-2 rounded-lg">
                        {history.length > 0 ? (
                            history.map((item, index) => (
                                <li key={index} className="p-2 bg-gray-200 rounded">
                                    <span className="font-bold">{formatDate(item.date)}</span> {' '}
                                    {item.change_type === 'add' ? '+' : '-'}{' '}
                                    {formatNumber(item.amount)}
                                </li>
                            ))
                        ) : (
                            <li className="p-2 bg-gray-200 rounded text-center">
                                История изменений отсутствует
                            </li>
                        )}
                    </ul>
                </div>

                {/* Футер */}
                <div className="p-6 border-t flex justify-end gap-2 bg-gray-800">
                    <button
                        onClick={onClose}
                        className="btn btn-sm btn-outline btn-error"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdvanceManager;
