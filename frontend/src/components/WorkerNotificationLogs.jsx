import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWorkerNotificationLogs } from '../api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FaHistory, FaCheckCircle, FaTimesCircle, FaFilter, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { useWorkers } from '../hooks/useWorkers';

const WorkerNotificationLogs = () => {
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const { data: workers = [] } = useWorkers();

    const { data: logsData, isLoading } = useQuery({
        queryKey: ['workerNotificationLogs', selectedWorkerId, selectedDate, selectedType],
        queryFn: async () => {
            const params = {};
            if (selectedWorkerId) params.worker_id = selectedWorkerId;
            if (selectedDate) params.event_date = selectedDate;
            if (selectedType) params.notification_type = selectedType;
            
            const response = await getWorkerNotificationLogs(params);
            return response.data;
        },
    });

    const logs = logsData?.results || logsData || [];

    const handleResetFilters = () => {
        setSelectedWorkerId('');
        setSelectedDate('');
        setSelectedType('');
    };

    return (
        <div className="bg-base-200 rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FaHistory className="text-primary" />
                История отправки уведомлений работникам
            </h3>

            {/* Фильтры */}
            <div className="mb-6 bg-base-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <FaFilter className="text-primary" />
                    <span className="font-semibold">Фильтры:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Работник</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={selectedWorkerId}
                            onChange={(e) => setSelectedWorkerId(e.target.value)}
                        >
                            <option value="">Все работники</option>
                            {workers.map((worker) => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Дата мероприятия</span>
                        </label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Тип уведомления</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="">Все типы</option>
                            <option value="today">Сегодня</option>
                            <option value="tomorrow">Завтра</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">&nbsp;</span>
                        </label>
                        <button
                            className="btn btn-outline w-full"
                            onClick={handleResetFilters}
                        >
                            Сбросить
                        </button>
                    </div>
                </div>
            </div>

            {/* Список логов */}
            {isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FaHistory className="text-4xl mx-auto mb-2 opacity-50" />
                    <p>История отправки уведомлений пуста</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={`bg-base-100 rounded-lg p-4 border-l-4 ${
                                log.status === 'success' ? 'border-green-500' : 'border-red-500'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    {log.status === 'success' ? (
                                        <FaCheckCircle className="text-green-500 text-xl" />
                                    ) : (
                                        <FaTimesCircle className="text-red-500 text-xl" />
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <FaUser className="text-sm text-gray-500" />
                                            <span className="font-semibold">{log.worker_name || 'Неизвестный работник'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                            <FaCalendarAlt className="text-xs" />
                                            <span>
                                                {format(new Date(log.event_date), 'dd.MM.yyyy', { locale: ru })} - 
                                                {log.notification_type === 'today' ? ' Сегодня' : ' Завтра'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                    {format(new Date(log.sent_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                                </div>
                            </div>

                            <div className="mt-2 text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">Телефон:</span>
                                    <span>{log.phone}</span>
                                </div>
                                {log.telegram_user_id && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold">Telegram ID:</span>
                                        <span>{log.telegram_user_id}</span>
                                    </div>
                                )}
                                {log.error && (
                                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400">
                                        <span className="font-semibold">Ошибка:</span> {log.error}
                                    </div>
                                )}
                                {log.message_text && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-primary hover:underline">
                                            Показать текст сообщения
                                        </summary>
                                        <div className="mt-2 p-3 bg-base-200 rounded text-sm whitespace-pre-wrap">
                                            {log.message_text}
                                        </div>
                                    </details>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Пагинация */}
            {logsData?.pagination && logsData.pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                    <div className="join">
                        {Array.from({ length: logsData.pagination.totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                className={`join-item btn ${logsData.pagination.currentPage === page ? 'btn-active' : ''}`}
                                onClick={() => {/* TODO: добавить пагинацию */}}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkerNotificationLogs;

