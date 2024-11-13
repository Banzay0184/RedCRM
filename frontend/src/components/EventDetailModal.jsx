import React from 'react';
import {format} from 'date-fns';
import {ru} from 'date-fns/locale';

const EventDetailModal = ({event, services, servicesColor, workersMap, onClose}) => {
    const formatCurrency = (number) =>
        new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'UZS'}).format(number);

    const formatDate = (dateString) => {
        if (!dateString) return 'Дата не указана';
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', {locale: ru});
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="modal modal-open flex items-center justify-center z-50">
            <div className="modal-box relative max-w-3xl p-8 rounded-xl shadow-2xl border-t-8 border-primary">
                {/* Основное содержимое модального окна */}
                <div className="modal-content">
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
                                <ul className="ml-4">
                                    {event.client.phones.map((phone) => (
                                        <li key={phone.id}>+{phone.phone_number}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        <section className="border-b pb-4">
                            <h4 className="text-xl font-semibold">Детали заказа</h4>
                            <div className="ml-4 space-y-1">
                                <p><strong>Комментарий:</strong> {event.comment}</p>
                                <p><strong>Сумма:</strong> {formatCurrency(event.amount)}</p>
                                <p><strong>Аванс:</strong> {formatCurrency(event.advance)}</p>
                            </div>
                        </section>

                        <section className="pb-4">
                            <h4 className="text-xl font-semibold">Устройства и услуги</h4>
                            {event.devices.map((device) => (
                                <div key={device.id} className="p-4 mt-4 rounded-lg border border-indigo-200">
                                    <p style={
                                        {
                                            color: servicesColor[device.service]
                                        }
                                    }><strong>Услуга:</strong> {services[device.service] || 'Услуга не найдена'}</p>
                                    <p className={device.restaurant_name ? '' : 'hidden'}>
                                        <strong>Ресторан:</strong> {device.restaurant_name}</p>
                                    <p className={device.camera_count ? '' : 'hidden'}><strong>Количество
                                        камер:</strong> {device.camera_count}</p>
                                    <p><strong>Дата услуги:</strong> {device.event_service_date
                                        ? format(new Date(device.event_service_date), 'dd.MM.yyyy', {locale: ru})
                                        : 'Дата не указана'}</p>
                                    <p className={device.comment ? '' : 'hidden'}>
                                        <strong>Комментарий:</strong> {device.comment}</p>

                                    <div className={device.workers ? '' : 'hidden'}>
                                        {device.workers.map((workerId) => (
                                            <p key={workerId}>
                                                 <strong>Работники:</strong> {workersMap[workerId] || 'Имя работника не найдено'}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className={event.comment ? 'border-b pb-4' : 'hidden'}>
                            <h4 className="text-xl font-semibold">Дополнительная информация</h4>
                            <div className="ml-4 space-y-1">
                                <p><strong>Комментарий:</strong> {event.comment}</p>
                            </div>
                        </section>

                        <section className="pb-4">
                            <h4 className="text-xl font-semibold">Временные метки</h4>
                            <div className="ml-4 space-y-1">
                                <p><strong>Дата
                                    создания:</strong> {format(new Date(event.created_at), 'dd.MM.yyyy HH:mm', {locale: ru})}
                                </p>
                                <p>
                                    <strong>Обновлено:</strong> {format(new Date(event.updated_at), 'dd.MM.yyyy HH:mm', {locale: ru})}
                                </p>
                            </div>
                        </section>

                    </div>

                    {/* Кнопка печати */}
                    <button
                        className="btn btn-primary w-full mt-6 print:hidden"
                        onClick={handlePrint}
                    >
                        Печать
                    </button>
                </div>

                {/* Печатный макет с современным дизайном */}
                <div className="print-content hidden">
                    {/* Логотип и заголовок */}
                    <div className="text-center mb-8">
                        <img src="../../public/logoRedB.png" alt="Логотип" className="mx-auto h-36 mb-4"/>
                        <h1 className="text-2xl font-bold text-primary mb-2">Договор на оказание услуг</h1>
                    </div>

                    {/* Дата и информация о клиенте */}
                    <div className="mb-2 border-b border-gray-300 pb-4 text-gray-700">
                        <p className="text-right text-sm mb-2">
                            <strong>Дата:</strong> {formatDate(new Date())}
                        </p>
                        <div className="flex justify-between">
                            <p className="text-lg font-semibold">
                                <strong>Клиент:</strong> {event.client.name}
                            </p>
                            <p className="text-lg font-semibold">
                                <strong>Телефон:</strong> +{event.client.phones.map((phone) => phone.phone_number).join(', +')}
                            </p>
                        </div>
                    </div>

                    {/* Услуги и устройства в виде карточек */}
                    <div className="mb-2">
                        <h2 className="text-2xl font-semibold mb-2 text-primary">Список услуг</h2>
                        <div className="grid grid-cols-3 gap-4">
                            {event.devices.map((device, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-100 p-4 rounded-lg shadow-md border border-gray-200"
                                >
                                    <h3 className="text-lg font-semibold text-primary mb-2">
                                        {services[device.service] || 'Услуга не найдена'}
                                    </h3>
                                    <p className="text-sm text-gray-700">
                                        <strong>Дата услуги:</strong> {formatDate(device.event_service_date)}
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
                                    ) || ''}
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
                    <div className="mb-2">
                        <h2 className="text-xl font-semibold mb-1 text-primary">Финансовая информация</h2>
                        <div className="flex text-gray-800">
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <p>
                                    <strong>Общая сумма:</strong> {formatCurrency(event.amount)}
                                </p>
                            </div>
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <p>
                                    <strong>Аванс:</strong> {formatCurrency(event.advance)}
                                </p>
                            </div>
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <p>
                                    <strong>Остаток:</strong>{' '}
                                    {formatCurrency(event.amount - event.advance)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Условия договора */}
                    <div className="mb-2">
                        <h2 className="text-xl font-semibold mb-2 text-primary">Условия договора</h2>
                        <p className="text-justify text-gray-700 leading-relaxed">
                            Согласно данному договору, Исполнитель обязуется оказать услуги, перечисленные выше, в
                            установленные сроки.
                        </p>
                    </div>

                    {/* Подписи сторон */}
                    <div className="flex justify-end gap-1 text-gray-700">
                        <p>Подпись заказчика</p>
                        <p>_________________</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailModal;
