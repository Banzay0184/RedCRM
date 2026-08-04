import React, {useEffect, useState} from 'react';
import axios from '../api';
import {format} from 'date-fns';
import {ru} from 'date-fns/locale';

const FIELD_LABELS = {
    amount: 'Сумма договора',
    amount_money: 'Валюта суммы',
    computer_numbers: 'Кол-во компьютеров',
    comment: 'Комментарий',
    client: 'Клиент',
    name: 'Имя клиента',
    phone_number: 'Телефон клиента',
};

const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '';
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
};

const formatDate = (dateString) => {
    if (!dateString) return 'Дата отсутствует';
    return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', {locale: ru});
};

const formatValue = (fieldName, value) => {
    if (value === null || value === undefined) return '—';
    if (fieldName === 'amount_money' || fieldName === 'advance_money') {
        return value === 'True' ? 'USD' : 'UZS';
    }
    if (fieldName === 'amount' || fieldName === 'computer_numbers') {
        return formatNumber(value);
    }
    return value;
};

const ContractHistoryManager = ({eventId, isOpen, onClose}) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, eventId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/events/${eventId}/history/`);
            setHistory(response.data || []);
        } catch (error) {
            console.error('Ошибка при загрузке истории договора:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const renderChange = (item) => {
        const label = FIELD_LABELS[item.field_name] || item.field_name;

        if (item.old_value === null) {
            return <>{label} добавлено: <span className="font-semibold">{formatValue(item.field_name, item.new_value)}</span></>;
        }
        if (item.new_value === null) {
            return <>{label} удалено: <span className="font-semibold">{formatValue(item.field_name, item.old_value)}</span></>;
        }
        return (
            <>
                {label}: <span className="line-through opacity-70">{formatValue(item.field_name, item.old_value)}</span>
                {' -> '}
                <span className="font-semibold">{formatValue(item.field_name, item.new_value)}</span>
            </>
        );
    };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50 ${isOpen ? 'visible' : 'hidden'}`}
        >
            <div className="bg-gray-800 text-black rounded-lg shadow-lg max-w-lg w-full overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-gray-800 text-white">
                    <h3 className="text-xl font-bold">История изменений договора</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-error">✕</button>
                </div>

                <div className="p-6 space-y-2 overflow-y-auto max-h-[400px]">
                    {loading ? (
                        <p className="text-white text-center">Загрузка...</p>
                    ) : history.length > 0 ? (
                        <ul className="space-y-2">
                            {history.map((item) => (
                                <li key={`${item.source}-${item.id}`} className="p-2 bg-gray-200 rounded">
                                    <div className="text-sm">{renderChange(item)}</div>
                                    <div className="text-xs text-gray-600 mt-1">
                                        {formatDate(item.changed_at)}
                                        {item.changed_by_name ? ` · ${item.changed_by_name}` : ''}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="p-2 bg-gray-200 rounded text-center">
                            История изменений отсутствует
                        </p>
                    )}
                </div>

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

export default ContractHistoryManager;
