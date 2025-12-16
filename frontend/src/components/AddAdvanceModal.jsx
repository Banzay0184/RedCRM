import React, { useState, useEffect, useMemo } from 'react';
import { FaMoneyBillWave, FaTimes, FaHistory, FaPlus, FaMinus, FaEdit, FaPaperPlane } from 'react-icons/fa';
import { updateEventAdvance, getEventById, sendAdvanceNotification, getAdvanceNotificationLogs } from '../api.js';
import { toast } from 'react-hot-toast';
import { format, isValid, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const AddAdvanceModal = ({ event, onClose, onUpdate, setErrorMessage }) => {
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [advanceCurrency, setAdvanceCurrency] = useState(event.advance_money ? 'USD' : 'UZS');
    const [changeType, setChangeType] = useState('add'); // 'add', 'subtract' или 'set'
    const [isLoading, setIsLoading] = useState(false);
    const [rawAmount, setRawAmount] = useState(''); // Необработанное значение для вычислений
    const [currentEvent, setCurrentEvent] = useState(event);
    const [advanceHistory, setAdvanceHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [sendingPhone, setSendingPhone] = useState(null);
    const [sentStatus, setSentStatus] = useState({});
    const [notificationHistory, setNotificationHistory] = useState([]);
    const [showNotificationHistory, setShowNotificationHistory] = useState(false);

    // Загружаем актуальные данные события при открытии модального окна
    useEffect(() => {
        fetchEventData();
        fetchNotificationHistory();
    }, []);

    const phones = useMemo(() => currentEvent.client?.phones || [], [currentEvent.client?.phones]);

    const fetchEventData = async () => {
        try {
            const response = await getEventById(event.id);
            const eventData = response.data;
            setCurrentEvent(eventData);
            setAdvanceHistory(eventData.advance_history || []);
        } catch (error) {
            console.error('Ошибка при загрузке данных события:', error);
        }
    };

    const fetchNotificationHistory = async () => {
        try {
            const response = await getAdvanceNotificationLogs(event.id);
            setNotificationHistory(response.data || []);
        } catch (error) {
            console.error('Ошибка при загрузке истории отправок авансов:', error);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Дата не указана';
        const date = parseISO(dateString);
        if (!isValid(date)) return 'Дата не указана';
        return format(date, 'dd.MM.yyyy HH:mm', { locale: ru });
    };

    const handleSendNotification = async (phoneNumber) => {
        // Предотвращаем повторные вызовы
        if (sendingPhone) {
            return;
        }
        
        setSendingPhone(phoneNumber);
        try {
            const response = await sendAdvanceNotification(event.id, phoneNumber);
            const status = response?.data?.status || 'success';
            setSentStatus((prev) => ({ ...prev, [phoneNumber]: status }));
            setNotificationHistory((prev) => [
                {
                    id: `local-${Date.now()}`,
                    phone: phoneNumber,
                    status,
                    error: null,
                    sent_at: new Date().toISOString(),
                },
                ...prev,
            ]);
            toast.success('Уведомление об авансе отправлено в Telegram');
        } catch (error) {
            const msg = error.response?.data?.detail || 'Не удалось отправить уведомление';
            setSentStatus((prev) => ({ ...prev, [phoneNumber]: 'error' }));
            setNotificationHistory((prev) => [
                {
                    id: `local-${Date.now()}`,
                    phone: phoneNumber,
                    status: 'error',
                    error: msg,
                    sent_at: new Date().toISOString(),
                },
                ...prev,
            ]);
            toast.error(msg);
        } finally {
            setSendingPhone(null);
        }
    };

    const formatCurrency = (number, isUSD) => {
        if (isUSD) {
            return new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(number);
        } else {
            // Для UZS убираем копейки и добавляем пробелы для разделения тысяч
            const formatted = Math.round(number).toLocaleString('ru-RU');
            return `${formatted} UZS`;
        }
    };

    // Функция форматирования числа с пробелами для ввода
    const formatNumber = (num) => {
        if (!num) return '';
        const parts = num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return parts.join(".");
    };

    // Обработчик изменения поля ввода
    const handleAmountChange = (e) => {
        const rawValue = e.target.value.replace(/\s/g, ''); // Убираем пробелы
        console.log('[DEBUG] AddAdvanceModal: Изменение ввода', {
            inputValue: e.target.value,
            rawValue,
            isValid: /^\d*\.?\d*$/.test(rawValue)
        });
        
        if (/^\d*\.?\d*$/.test(rawValue)) { // Только числа и точка
            setRawAmount(rawValue); // Сохраняем необработанное значение
            setAdvanceAmount(formatNumber(rawValue)); // Форматируем для отображения
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log('[DEBUG] AddAdvanceModal: Отправка формы', {
            rawAmount,
            advanceAmount,
            changeType,
            advanceCurrency
        });
        
        if (!rawAmount || rawAmount.trim() === '') {
            console.log('[DEBUG] AddAdvanceModal: Ошибка валидации - пустая сумма');
            setErrorMessage('Пожалуйста, введите корректную сумму');
            return;
        }

        const changeAmount = parseFloat(rawAmount);
        
        if (isNaN(changeAmount) || changeAmount <= 0) {
            console.log('[DEBUG] AddAdvanceModal: Ошибка валидации - некорректная сумма', { rawAmount, changeAmount });
            setErrorMessage('Пожалуйста, введите корректную сумму');
            return;
        }
        const totalAmount = currentEvent.amount;
        const currentAdvance = currentEvent.advance;
        
        console.log('[DEBUG] AddAdvanceModal: Вычисления', {
            changeAmount,
            totalAmount,
            currentAdvance
        });
        
        // Вычисляем новый аванс в зависимости от типа операции
        let newTotalAdvance;
        let actualChangeType = changeType;
        let actualChangeAmount = changeAmount;
        
        if (changeType === 'add') {
            newTotalAdvance = currentAdvance + changeAmount;
        } else if (changeType === 'subtract') {
            newTotalAdvance = currentAdvance - changeAmount;
        } else if (changeType === 'set') {
            newTotalAdvance = changeAmount; // Устанавливаем абсолютное значение
            // Для 'set' вычисляем разность и используем 'add' или 'subtract'
            const difference = changeAmount - currentAdvance;
            if (difference > 0) {
                actualChangeType = 'add';
                actualChangeAmount = difference;
            } else if (difference < 0) {
                actualChangeType = 'subtract';
                actualChangeAmount = Math.abs(difference);
            } else {
                // Если разность равна 0, ничего не делаем
                console.log('[DEBUG] AddAdvanceModal: Разность равна 0, ничего не делаем');
                setErrorMessage('Новый аванс равен текущему авансу');
                return;
            }
        }

        console.log('[DEBUG] AddAdvanceModal: Новый аванс', {
            newTotalAdvance,
            changeType,
            actualChangeType,
            actualChangeAmount
        });

        // Дополнительная проверка: убеждаемся, что actualChangeType корректный
        if (actualChangeType !== 'add' && actualChangeType !== 'subtract') {
            console.log('[DEBUG] AddAdvanceModal: Ошибка - некорректный тип изменения', actualChangeType);
            setErrorMessage('Некорректный тип операции');
            return;
        }

        // Проверяем, что actualChangeAmount корректный
        if (actualChangeAmount === undefined || actualChangeAmount === null || isNaN(actualChangeAmount) || actualChangeAmount <= 0) {
            console.log('[DEBUG] AddAdvanceModal: Ошибка - некорректная сумма изменения', actualChangeAmount);
            setErrorMessage('Некорректная сумма для изменения');
            return;
        }

        // Дополнительная проверка для случая, когда сумма изменения равна 0
        if (actualChangeAmount === 0) {
            console.log('[DEBUG] AddAdvanceModal: Сумма изменения равна 0, ничего не делаем');
            setErrorMessage('Сумма изменения не может быть равна 0');
            return;
        }

        // Проверяем границы
        if (newTotalAdvance < 0) {
            console.log('[DEBUG] AddAdvanceModal: Ошибка - отрицательный аванс');
            setErrorMessage('Аванс не может быть отрицательным');
            return;
        }
        
        // Предупреждение, если аванс превышает общую сумму, но не блокируем
        if (newTotalAdvance > totalAmount) {
            console.log('[DEBUG] AddAdvanceModal: Предупреждение - аванс превышает общую сумму');
            const confirmMessage = `Внимание! Новый аванс (${formatCurrency(newTotalAdvance, advanceCurrency === 'USD')}) превышает общую сумму заказа (${formatCurrency(totalAmount, event.amount_money === 'USD')}). Продолжить?`;
            
            if (!window.confirm(confirmMessage)) {
                return;
            }
        }

        console.log('[DEBUG] AddAdvanceModal: Валидация пройдена, начинаем загрузку');
        setIsLoading(true);

        try {
            const requestData = {
                amount: actualChangeAmount,
                change_type: actualChangeType,
                advance_money: advanceCurrency === 'USD'
            };

            console.log('[DEBUG] AddAdvanceModal: Отправляем запрос на сервер', {
                eventId: event.id,
                requestData,
                originalChangeType: changeType,
                originalAmount: changeAmount
            });

            // Отправляем запрос на обновление аванса
            await updateEventAdvance(event.id, requestData);
            
            console.log('[DEBUG] AddAdvanceModal: Запрос успешно выполнен');
            
            // Обновляем локальное состояние
            const updatedEvent = {
                ...currentEvent,
                advance: newTotalAdvance,
                advance_money: advanceCurrency === 'USD'
            };
            setCurrentEvent(updatedEvent);
            
            // Загружаем актуальные данные с сервера
            await fetchEventData();
            
            // Вызываем функцию обновления для обновления UI в родительском компоненте
            if (onUpdate) {
                await onUpdate(updatedEvent);
            }
            
            // Очищаем форму, но НЕ закрываем модальное окно
            setAdvanceAmount('');
            setRawAmount('');
            
            // Показываем сообщение об успехе
            setErrorMessage(''); // Очищаем предыдущие ошибки
            // Можно добавить уведомление об успехе, если нужно
            
        } catch (error) {
            console.error('[DEBUG] AddAdvanceModal: Ошибка при изменении аванса:', error);
            console.error('[DEBUG] AddAdvanceModal: Детали ошибки:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            const errorMessage = error.response?.data?.error || error.message || 'Ошибка при изменении аванса. Попробуйте еще раз.';
            setErrorMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const currentAdvance = currentEvent.advance || 0;
    const totalAmount = currentEvent.amount || 0;
    const remainingAmount = totalAmount - currentAdvance;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            <div className="modal-box relative max-w-2xl w-full bg-gray-900 border border-gray-700 rounded-lg shadow-2xl">
                {/* Заголовок */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 className="flex items-center text-xl font-bold text-white">
                        <FaMoneyBillWave className="mr-2 text-green-400"/>
                        Управление авансами
                    </h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="btn btn-sm btn-outline border-gray-600 text-gray-300 hover:bg-gray-700"
                            title="История изменений авансов"
                        >
                            <FaHistory className="mr-1"/>
                            изменений
                        </button>
                        <button
                            onClick={() => {
                                setShowNotificationHistory(!showNotificationHistory);
                                if (!showNotificationHistory) {
                                    fetchNotificationHistory();
                                }
                            }}
                            className="btn btn-sm btn-outline border-gray-600 text-gray-300 hover:bg-gray-700"
                            title="История отправок уведомлений"
                        >
                            <FaPaperPlane className="mr-1"/>
                            отправок
                        </button>
                <button
                    onClick={onClose}
                            className="btn btn-sm btn-ghost text-gray-400 hover:text-white hover:bg-gray-700"
                    disabled={isLoading}
                >
                    <FaTimes />
                </button>
                    </div>
                </div>

                <div className="p-4">
                    {/* Информация о клиенте и суммах */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-800 border border-gray-700 p-3 rounded">
                            <p className="text-sm text-gray-400">Клиент</p>
                            <p className="font-semibold text-white">{currentEvent.client?.name || 'Не указан'}</p>
                            {phones.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Телефоны:</p>
                                    <div className="space-y-1">
                                        {phones.map((phone) => (
                                            <div key={phone.id} className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-gray-300">+{phone.phone_number}</span>
                                                <button
                                                    className={`btn btn-xs ${sendingPhone === phone.phone_number ? 'loading' : 'btn-secondary'}`}
                                                    onClick={() => handleSendNotification(phone.phone_number)}
                                                    disabled={!!sendingPhone}
                                                    title="Отправить уведомление об авансе"
                                                >
                                                    {sendingPhone === phone.phone_number ? (
                                                        'Отправка...'
                                                    ) : (
                                                        <FaPaperPlane />
                                                    )}
                                                </button>
                                                {sentStatus[phone.phone_number] === 'success' && (
                                                    <span className="badge badge-success badge-xs text-white">Отправлено</span>
                                                )}
                                                {sentStatus[phone.phone_number] === 'error' && (
                                                    <span className="badge badge-error badge-xs text-white">Ошибка</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-800 border border-gray-700 p-3 rounded">
                            <p className="text-sm text-gray-400">Общая сумма</p>
                            <p className="font-semibold text-white">{formatCurrency(totalAmount, currentEvent.amount_money)}</p>
                        </div>
                        <div className="bg-green-900 border border-green-700 p-3 rounded">
                            <p className="text-sm text-green-400">Текущий аванс</p>
                            <p className="font-semibold text-green-300">{formatCurrency(currentAdvance, currentEvent.advance_money)}</p>
                        </div>
                        <div className="bg-blue-900 border border-blue-700 p-3 rounded">
                            <p className="text-sm text-blue-400">Остаток к доплате</p>
                            <p className="font-semibold text-blue-300">{formatCurrency(remainingAmount, currentEvent.amount_money)}</p>
                        </div>
                    </div>

                    {/* История изменений авансов */}
                    {showHistory && (
                        <div className="mb-4">
                            <h4 className="text-lg font-semibold mb-2 text-white">История изменений авансов</h4>
                            <div className="max-h-40 overflow-y-auto border border-gray-700 rounded bg-gray-800">
                                {advanceHistory.length > 0 ? (
                                    <div className="divide-y divide-gray-700">
                                        {advanceHistory.map((item, index) => (
                                            <div key={item.id || index} className="p-3 flex items-center justify-between hover:bg-gray-700">
                                                <div className="flex items-center">
                                                    {item.change_type === 'add' ? (
                                                        <FaPlus className="text-green-400 mr-2" />
                                                    ) : (
                                                        <FaMinus className="text-red-400 mr-2" />
                                                    )}
                                                    <span className="font-medium text-white">
                                                        {formatCurrency(item.amount, currentEvent.advance_money)}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    {new Date(item.date).toLocaleString('ru-RU')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-gray-400">
                                        История изменений авансов пуста
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* История отправок уведомлений об авансе */}
                    {showNotificationHistory && (
                        <div className="mb-4">
                            <h4 className="text-lg font-semibold mb-2 text-white">История отправок уведомлений об авансе</h4>
                            <div className="max-h-40 overflow-y-auto border border-gray-700 rounded bg-gray-800">
                                {notificationHistory.length > 0 ? (
                                    <div className="divide-y divide-gray-700">
                                        {notificationHistory.map((item) => (
                                            <div key={item.id} className="p-3 flex flex-wrap gap-2 items-center text-sm hover:bg-gray-700">
                                                <span className="font-semibold text-white">+{item.phone}</span>
                                                <span
                                                    className={`badge badge-xs ${item.status === 'success' ? 'badge-success' : 'badge-error'} text-white`}
                                                >
                                                    {item.status === 'success' ? 'Успех' : 'Ошибка'}
                                                </span>
                                                <span className="text-gray-400">
                                                    {item.sent_at ? formatDateTime(item.sent_at) : ''}
                                                </span>
                                                {item.error && <span className="text-error text-xs">{item.error}</span>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-gray-400">
                                        Отправок уведомлений об авансе ещё не было
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Форма для изменения аванса */}
                    <div className="bg-gray-800 border border-gray-700 p-4 rounded">
                        <h4 className="text-lg font-semibold mb-3 text-white">Изменить аванс</h4>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                    <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                            Тип операции
                        </label>
                        <select
                            value={changeType}
                            onChange={(e) => setChangeType(e.target.value)}
                                        className="w-full select select-bordered select-sm bg-gray-700 border-gray-600 text-white"
                            disabled={isLoading}
                        >
                                        <option value="add">Добавить</option>
                                        <option value="subtract">Убрать</option>
                                        <option value="set">Установить</option>
                        </select>
                    </div>
                    
                    <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                            Сумма
                        </label>
                            <input
                                type="text"
                                value={advanceAmount}
                                onChange={handleAmountChange}
                                        className="w-full input input-bordered input-sm bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                        placeholder={changeType === 'set' ? 'Новый аванс' : 'Сумма'}
                                required
                                disabled={isLoading}
                            />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Валюта
                                    </label>
                            <select
                                value={advanceCurrency}
                                onChange={(e) => setAdvanceCurrency(e.target.value)}
                                        className="w-full select select-bordered select-sm bg-gray-700 border-gray-600 text-white"
                                        disabled={isLoading || true}
                            >
                                <option value="UZS">UZS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                            </div>
                            
                            <div className="text-xs text-gray-400">
                            {changeType === 'add' 
                                    ? `Рекомендуется: не более ${formatCurrency(remainingAmount, currentEvent.amount_money)}`
                                : changeType === 'subtract'
                                    ? `Максимум: ${formatCurrency(currentAdvance, currentEvent.advance_money)}`
                                    : `Текущий аванс: ${formatCurrency(currentAdvance, currentEvent.advance_money)}`
                            }
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                                    className="flex-1 btn btn-outline btn-sm border-gray-600 text-gray-300 hover:bg-gray-700"
                            disabled={isLoading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                                    className="flex-1 btn btn-primary btn-sm bg-green-600 hover:bg-green-700 text-white"
                            disabled={isLoading || !rawAmount}
                        >
                            {isLoading 
                                ? (changeType === 'add' ? 'Добавление...' : 
                                   changeType === 'subtract' ? 'Удаление...' : 
                                   'Установка...') 
                                        : (changeType === 'add' ? 'Добавить' : 
                                           changeType === 'subtract' ? 'Убрать' : 
                                           'Установить')
                            }
                        </button>
                    </div>
                </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddAdvanceModal;
