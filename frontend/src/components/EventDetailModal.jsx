import React, {useEffect, useMemo, useState} from 'react';
import {format, isValid, parseISO} from 'date-fns';
import {ru} from 'date-fns/locale';
import {getEventContractLogs, sendEventContract} from '../api';
import {toast} from 'react-hot-toast';

const EventDetailModal = ({event, services, servicesColor, workersMap, onClose}) => {
    const [sendingPhone, setSendingPhone] = useState(null);
    const [sentStatus, setSentStatus] = useState({});
    const [history, setHistory] = useState(() => event.telegram_logs || event.telegram_history || []);
    const [historyLoading, setHistoryLoading] = useState(false);

    const formatCurrency = (number, isUSD) =>
        new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: isUSD ? 'USD' : 'UZS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(number);

    const formatDate = (dateString) => {
        if (!dateString) return 'Дата не указана';
        const date = parseISO(dateString);
        if (!isValid(date)) return 'Дата не указана';
        return format(date, 'dd MMMM yyyy', {locale: ru});
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Дата не указана';
        const date = parseISO(dateString);
        if (!isValid(date)) return 'Дата не указана';
        return format(date, 'dd.MM.yyyy HH:mm', {locale: ru});
    };

    const formatDateShort = (dateString) => {
        if (!dateString) return 'Дата не указана';
        const date = parseISO(dateString);
        if (!isValid(date)) return 'Дата не указана';
        return format(date, 'dd.MM.yyyy', {locale: ru});
    };

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        const loadHistory = async () => {
            setHistoryLoading(true);
            try {
                const res = await getEventContractLogs(event.id);
                setHistory(res.data || []);
            } catch (error) {
                // Логируем, но не мешаем UI
                console.error('Не удалось загрузить историю отправок', error);
            } finally {
                setHistoryLoading(false);
            }
        };
        loadHistory();
    }, [event.id]);

    const phones = useMemo(() => event.client.phones || [], [event.client.phones]);

    const handleSendContract = async (phoneNumber) => {
        // Предотвращаем повторные вызовы
        if (sendingPhone) {
            return;
        }
        
        setSendingPhone(phoneNumber);
        try {
            const response = await sendEventContract(event.id, phoneNumber);
            const status = response?.data?.status || 'success';
            setSentStatus((prev) => ({...prev, [phoneNumber]: status}));
            setHistory((prev) => [
                {
                    id: `local-${Date.now()}`,
                    phone: phoneNumber,
                    status,
                    error: null,
                    sent_at: new Date().toISOString(),
                },
                ...prev,
            ]);
            toast.success('Договор отправлен в Telegram');
        } catch (error) {
            const msg = error.response?.data?.detail || 'Не удалось отправить договор';
            setSentStatus((prev) => ({...prev, [phoneNumber]: 'error'}));
            setHistory((prev) => [
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

    // Текущая дата для печатной версии
    const currentDate = format(new Date(), 'dd MMMM yyyy', {locale: ru});

    return (
        <div className="modal modal-open flex items-center justify-center z-50">
            <div className="modal-box relative max-w-3xl p-8 rounded-xl shadow-2xl border-t-8 border-primary">
                {/* Основное содержимое модального окна */}
                <div className="modal-content print:hidden">
                    <div
                        className="btn btn-sm btn-circle absolute left-3 top-3 bg-info text-white print:hidden"
                    >
                        {event.computer_numbers}
                    </div>
                    <button
                        className="btn btn-sm btn-circle absolute right-3 top-3 bg-error text-white hover:bg-error-focus print:hidden"
                        onClick={onClose}
                    >
                        ✕
                    </button>

                    <h3 className="text-3xl font-bold mb-8 text-center">Детали события</h3>

                    <div className="space-y-6">
                        <section className="border-b pb-4">
                            <h4 className="text-xl font-semibold">Клиент</h4>
                            <p className="text-lg ml-4">{event.client.name}</p>
                            <div className="mt-2">
                                <p className="font-semibold">Телефоны:</p>
                                <ul className="ml-4 space-y-2">
                                    {phones.map((phone) => (
                                        <li key={phone.id} className="flex items-center gap-3 flex-wrap">
                                            <span className="font-medium">+{phone.phone_number}</span>
                                            <button
                                                className={`btn btn-sm btn-secondary ${sendingPhone === phone.phone_number ? 'loading' : ''}`}
                                                onClick={() => handleSendContract(phone.phone_number)}
                                                disabled={!!sendingPhone}
                                            >
                                                {sendingPhone === phone.phone_number ? 'Отправка...' : 'Отправить в Telegram'}
                                            </button>
                                            {sentStatus[phone.phone_number] === 'success' && (
                                                <span className="badge badge-success text-white">Отправлено</span>
                                            )}
                                            {sentStatus[phone.phone_number] === 'error' && (
                                                <span className="badge badge-error text-white">Ошибка</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        <section className="border-b pb-4">
                            <h4 className="text-xl font-semibold">История отправок</h4>
                            {historyLoading ? (
                                <p className="text-sm text-gray-500 mt-2">Загрузка...</p>
                            ) : history?.length ? (
                                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                                    {history.map((item) => (
                                        <div key={item.id} className="flex flex-wrap gap-3 items-center text-sm">
                                            <span className="font-semibold">+{item.phone}</span>
                                            <span
                                                className={`badge ${item.status === 'success' ? 'badge-success' : 'badge-error'} text-white`}
                                            >
                                                {item.status === 'success' ? 'Успех' : 'Ошибка'}
                                            </span>
                                            <span className="text-gray-600">
                                                {item.sent_at ? formatDateTime(item.sent_at) : ''}
                                            </span>
                                            {item.error && <span className="text-error">{item.error}</span>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 mt-2">Отправок ещё не было</p>
                            )}
                        </section>

                        <section className="border-b pb-4">
                            <h4 className="text-xl font-semibold">Детали заказа</h4>
                            <div className="ml-4 space-y-1">
                                <p><strong>Комментарий:</strong> {event.comment}</p>
                                <p><strong>Сумма:</strong> {formatCurrency(event.amount, event.amount_money)}</p>
                                <p><strong>Аванс:</strong> {formatCurrency(event.advance, event.advance_money)}</p>
                                <p>
                                    <strong>Остаток:</strong> {formatCurrency(event.amount - event.advance, event.amount_money)}
                                </p>
                            </div>
                        </section>

                        <section className="pb-4">
                            <h4 className="text-xl font-semibold">Устройства и услуги</h4>
                            {event.devices.map((device) => (
                                <div key={device.id} className="p-4 mt-4 rounded-lg border border-indigo-200">
                                    <p style={{color: servicesColor[device.service]}}>
                                        <strong>Услуга:</strong> {services[device.service] || 'Услуга не найдена'}
                                    </p>
                                    {device.restaurant_name && (
                                        <p><strong>Ресторан:</strong> {device.restaurant_name}</p>
                                    )}
                                    {device.camera_count && (
                                        <p><strong>Количество камер:</strong> {device.camera_count}</p>
                                    )}
                                    <p>
                                        <strong>Дата услуги:</strong>{' '}
                                        {device.event_service_date ? formatDateShort(device.event_service_date) : 'Дата не указана'}
                                    </p>
                                    {device.comment && (
                                        <p><strong>Комментарий:</strong> {device.comment}</p>
                                    )}

                                    {device.workers && device.workers.length > 0 && (
                                        <p>
                                            <strong>Работники:</strong> {device.workers
                                                .map((workerId) => workersMap[workerId])
                                                .filter(Boolean)
                                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                .map(worker => worker.name)
                                                .join(', ')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </section>

                        {event.comment && (
                            <section className="border-b pb-4">
                                <h4 className="text-xl font-semibold">Дополнительная информация</h4>
                                <div className="ml-4 space-y-1">
                                    <p><strong>Комментарий:</strong> {event.comment}</p>
                                </div>
                            </section>
                        )}

                        <section className="pb-4">
                            <h4 className="text-xl font-semibold">Временные метки</h4>
                            <div className="ml-4 space-y-1">
                                <p><strong>Дата создания:</strong> {formatDateTime(event.created_at)}</p>
                                <p><strong>Обновлено:</strong> {formatDateTime(event.updated_at)}</p>
                            </div>
                        </section>
                    </div>

                    {/* Кнопка печати */}
                    <div className="flex flex-col gap-3 mt-6 print:hidden">
                        <button
                            className="btn btn-primary w-full"
                            onClick={handlePrint}
                        >
                            Печать
                        </button>
                    </div>
                </div>

                {/* Печатный макет */}
                <div className="print-content hidden">
                    {/* Логотип и заголовок */}
                    <div className="text-center mb-8">
                        <img src="/redlogo.png" alt="Логотип" className="mx-auto w-[300px] mb-4"/>
                    </div>

                    {/* Дата и информация о клиенте */}
                    <div className="mb-2 flex items-start p-2 justify-between border-b border-gray-300 text-gray-700">
                        <div className="flex flex-col">
                            <p className="text-lg font-semibold">
                                <strong>Клиент:</strong> {event.client.name}
                            </p>
                            <p className="text-lg font-semibold">
                                <strong>Телефон:</strong> +{event.client.phones.map((phone) => phone.phone_number).join(', +')}
                            </p>
                        </div>
                        <div>
                            <p className="text-right text-sm">
                                <strong>Дата:</strong> {currentDate}
                            </p>
                            <p className="text-sm">
                                <strong>Номер компьютера:</strong> {event.computer_numbers || '_________'}
                            </p>
                        </div>
                    </div>

                    {/* Услуги и устройства */}
                    <div className="mb-2">
                        <h2 className="text-2xl font-semibold mb-2 text-primary">Список услуг</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {event.devices.map((device, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-100 p-4 rounded-lg shadow-md border border-gray-200"
                                >
                                    <h3 className="text-lg font-semibold text-primary">
                                        {services[device.service] || 'Услуга не найдена'}
                                    </h3>
                                    <p className="text-sm text-gray-700">
                                        <strong>Дата услуги:</strong> {device.event_service_date ? formatDate(device.event_service_date) : 'Дата не указана'}
                                    </p>
                                    {device.restaurant_name && (
                                        <p className="text-sm text-gray-700">
                                            <strong>Ресторан:</strong> {device.restaurant_name}
                                        </p>
                                    )}
                                    {device.camera_count && (
                                        <p className="text-sm text-gray-700">
                                            <strong>Количество камер:</strong> {device.camera_count}
                                        </p>
                                    )}
                                    {device.comment && (
                                        <p className="text-sm text-gray-700">
                                            <strong>Комментарий:</strong> {device.comment}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Финансовая информация */}
                    <div className="mb-1">
                        <h2 className="text-xl font-semibold mb-1 text-primary">Финансовая информация</h2>
                        <div className="flex text-gray-800 space-x-2">
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <p>
                                    <strong>Общая сумма:</strong> {formatCurrency(event.amount, event.amount_money)}
                                </p>
                            </div>
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <p>
                                    <strong>Аванс:</strong> {formatCurrency(event.advance, event.advance_money)}
                                </p>
                            </div>
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <p>
                                    <strong>Остаток:</strong> {formatCurrency(event.amount - event.advance, event.amount_money)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Условия договора */}
                    <div className="mb-1">
                        <h2 className="text-xl font-semibold mb-2 text-primary">Условия договора</h2>
                        <p className="text-justify text-gray-700 leading-relaxed">
                            Просим вас ознакомиться с описанием предоставляемых услуг, представленным выше.
                            Обращаем ваше внимание, что полная предоплата (100%) должна быть произведена до дня свадьбы.
                            Спасибо, что выбрали нас!
                        </p>
                    </div>

                    {/* Подписи сторон */}
                    <div className="flex justify-end gap-1 text-gray-700">
                        <p>Подпись заказчика</p>
                        <p>_________________</p>
                    </div>

                    <div className="mt-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-4 border border-black border-dashed">
                                <p className="text-sm text-gray-700">
                                    <strong>Дата услуги:</strong>
                                    {event.devices[0] ? formatDate(event.devices[0].event_service_date) : 'Дата не указана'}
                                </p>
                                <p className="text-sm">
                                    <strong>Клиент:</strong> {event.client.name}
                                </p>
                                <p className="text-sm">
                                    <strong>Телефон:</strong> +{event.client.phones.map((phone) => phone.phone_number).join(', +')}
                                </p>
                                <p className="text-sm">
                                    <strong>Долг:</strong> ______________
                                </p>
                            </div>
                            <div className="p-4 flex flex-col items-end border border-black border-dashed">
                                <h3 className="text-sm font-bold">
                                    _________ Монтажёр
                                </h3>
                                <p className="text-sm text-gray-700">
                                    <strong>Дата услуги:</strong>
                                    {event.devices[0] ? formatDate(event.devices[0].event_service_date) : 'Дата не указана'}
                                </p>
                                <p className="text-sm">
                                    <strong>Клиент:</strong> {event.client.name}
                                </p>
                                <p className="text-sm">
                                    {event.computer_numbers || '_________'} <strong>Номер компьютера</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default EventDetailModal;
