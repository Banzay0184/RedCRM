import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkerNotificationSettings, updateWorkerNotificationSettings, sendWorkerNotificationsManual } from '../api';
import { FaBell, FaClock, FaToggleOn, FaToggleOff, FaPaperPlane } from 'react-icons/fa';

const WorkerNotificationSettings = () => {
    const queryClient = useQueryClient();
    const [time, setTime] = useState('09:00');
    const [enabled, setEnabled] = useState(true);

    const { data: settings, isLoading } = useQuery({
        queryKey: ['workerNotificationSettings'],
        queryFn: async () => {
            const response = await getWorkerNotificationSettings();
            return response.data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateWorkerNotificationSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workerNotificationSettings'] });
        },
    });

    const sendManualMutation = useMutation({
        mutationFn: sendWorkerNotificationsManual,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workerNotificationLogs'] });
        },
    });

    useEffect(() => {
        if (settings) {
            // Преобразуем время из формата "HH:MM:SS" в "HH:MM"
            const timeStr = settings.notification_time || '09:00:00';
            const timeParts = timeStr.split(':');
            setTime(`${timeParts[0]}:${timeParts[1]}`);
            setEnabled(settings.enabled !== false);
        }
    }, [settings]);

    const handleSave = () => {
        // Преобразуем время в формат "HH:MM:SS"
        const timeParts = time.split(':');
        const timeValue = `${timeParts[0]}:${timeParts[1]}:00`;
        
        updateMutation.mutate({
            notification_time: timeValue,
            enabled: enabled,
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="bg-base-200 rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FaBell className="text-primary" />
                Настройки уведомлений работникам
            </h3>
            
            <div className="space-y-4">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-semibold flex items-center gap-2">
                            <FaClock className="text-sm" />
                            Время отправки уведомлений
                        </span>
                    </label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="input input-bordered w-full max-w-xs"
                    />
                    <label className="label">
                        <span className="label-text-alt text-gray-500">
                            Уведомления будут отправляться работникам о мероприятиях сегодня и завтра
                        </span>
                    </label>
                </div>

                <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                        <span className="label-text font-semibold">Включить автоматические уведомления</span>
                        {enabled ? (
                            <FaToggleOn 
                                className="text-3xl text-primary cursor-pointer" 
                                onClick={() => setEnabled(false)}
                            />
                        ) : (
                            <FaToggleOff 
                                className="text-3xl text-gray-400 cursor-pointer" 
                                onClick={() => setEnabled(true)}
                            />
                        )}
                    </label>
                    <label className="label">
                        <span className="label-text-alt text-gray-500">
                            {enabled 
                                ? 'Уведомления включены и будут отправляться автоматически' 
                                : 'Уведомления выключены'}
                        </span>
                    </label>
                </div>

                <div className="flex justify-between items-center mt-6">
                    <button
                        onClick={() => sendManualMutation.mutate()}
                        disabled={sendManualMutation.isPending}
                        className="btn btn-outline btn-secondary"
                        title="Отправить уведомления сейчас (для тестирования)"
                    >
                        {sendManualMutation.isPending ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Отправка...
                            </>
                        ) : (
                            <>
                                <FaPaperPlane />
                                Отправить сейчас
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="btn btn-primary"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Сохранение...
                            </>
                        ) : (
                            'Сохранить'
                        )}
                    </button>
                </div>

                {updateMutation.isSuccess && (
                    <div className="alert alert-success mt-4">
                        <span>Настройки успешно сохранены!</span>
                    </div>
                )}

                {updateMutation.isError && (
                    <div className="alert alert-error mt-4">
                        <span>Ошибка при сохранении настроек</span>
                    </div>
                )}

                {sendManualMutation.isSuccess && (
                    <div className="alert alert-success mt-4">
                        <span>Задача отправки уведомлений запущена! Проверьте историю отправки через несколько секунд.</span>
                    </div>
                )}

                {sendManualMutation.isError && (
                    <div className="alert alert-error mt-4">
                        <span>Ошибка при запуске отправки уведомлений</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkerNotificationSettings;

