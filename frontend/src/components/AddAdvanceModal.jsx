import React, { useState } from 'react';
import { FaMoneyBillWave, FaTimes } from 'react-icons/fa';

const AddAdvanceModal = ({ event, onClose, onUpdate, setErrorMessage }) => {
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [advanceCurrency, setAdvanceCurrency] = useState(event.advance_money || 'UZS');
    const [isLoading, setIsLoading] = useState(false);

    const formatCurrency = (number, isUSD) =>
        new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: isUSD ? 'USD' : 'UZS',
            minimumFractionDigits: isUSD ? 2 : 0,
            maximumFractionDigits: isUSD ? 2 : 0,
        }).format(number);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!advanceAmount || parseFloat(advanceAmount) <= 0) {
            setErrorMessage('Пожалуйста, введите корректную сумму аванса');
            return;
        }

        const newAdvanceAmount = parseFloat(advanceAmount);
        const totalAmount = event.amount;
        const currentAdvance = event.advance;
        const newTotalAdvance = currentAdvance + newAdvanceAmount;

        // Проверяем, не превышает ли новый аванс общую сумму
        if (newTotalAdvance > totalAmount) {
            setErrorMessage('Сумма аванса не может превышать общую сумму заказа');
            return;
        }

        setIsLoading(true);

        try {
            // Подготавливаем данные для обновления
            const updatedEvent = {
                ...event,
                advance: newTotalAdvance,
                advance_money: advanceCurrency
            };

            // Вызываем функцию обновления
            await onUpdate(updatedEvent);
            
            // Закрываем модальное окно
            onClose();
            
            // Очищаем форму
            setAdvanceAmount('');
            
        } catch (error) {
            console.error('Ошибка при добавлении аванса:', error);
            setErrorMessage('Ошибка при добавлении аванса. Попробуйте еще раз.');
        } finally {
            setIsLoading(false);
        }
    };

    const currentAdvance = event.advance || 0;
    const totalAmount = event.amount || 0;
    const remainingAmount = totalAmount - currentAdvance;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="modal-box relative max-w-md w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-lg shadow-xl">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-lg text-white hover:text-gray-300 focus:outline-none"
                    disabled={isLoading}
                >
                    <FaTimes />
                </button>
                
                <h3 className="flex items-center text-xl font-bold mb-4">
                    <FaMoneyBillWave className="mr-2"/>
                    Добавить аванс
                </h3>
                
                <div className="space-y-4 mb-6">
                    <div className="bg-white bg-opacity-20 p-3 rounded">
                        <p className="text-sm">
                            <strong>Клиент:</strong> {event.client.name}
                        </p>
                        <p className="text-sm">
                            <strong>Общая сумма:</strong> {formatCurrency(totalAmount, event.amount_money)}
                        </p>
                        <p className="text-sm">
                            <strong>Текущий аванс:</strong> {formatCurrency(currentAdvance, event.advance_money)}
                        </p>
                        <p className="text-sm">
                            <strong>Остаток к доплате:</strong> {formatCurrency(remainingAmount, event.amount_money)}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Сумма аванса
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={remainingAmount}
                                value={advanceAmount}
                                onChange={(e) => setAdvanceAmount(e.target.value)}
                                className="flex-1 input input-bordered bg-white text-black"
                                placeholder="Введите сумму"
                                required
                                disabled={isLoading}
                            />
                            <select
                                value={advanceCurrency}
                                onChange={(e) => setAdvanceCurrency(e.target.value)}
                                className="select select-bordered bg-white text-black"
                                disabled={isLoading}
                            >
                                <option value="UZS">UZS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <p className="text-xs text-gray-200 mt-1">
                            Максимум: {formatCurrency(remainingAmount, event.amount_money)}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn btn-outline text-white border-white hover:bg-white hover:text-green-600"
                            disabled={isLoading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn bg-white text-green-600 hover:bg-gray-100"
                            disabled={isLoading || !advanceAmount}
                        >
                            {isLoading ? 'Добавление...' : 'Добавить аванс'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAdvanceModal;
