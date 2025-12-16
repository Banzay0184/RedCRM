import React, {useContext, useState, useMemo, useCallback} from 'react';
import {deleteEvent} from '../api';
import EventDetailModal from './EventDetailModal';
import EditEventModal from './EditEventModal';
import AddAdvanceModal from './AddAdvanceModal.jsx';
import {format, isToday, isTomorrow, isValid, isWithinInterval, parseISO} from 'date-fns';
import {ru} from 'date-fns/locale';
import {FaDollarSign, FaEdit, FaInfoCircle, FaTrash} from 'react-icons/fa';
import {GlobalContext} from './BaseContex.jsx';
import {canManageEvents, isAdmin} from '../utils/roles.js';
import {useServices} from '../hooks/useServices';
import {useWorkers} from '../hooks/useWorkers';

const EventList = ({
    events,
    loading,
    onDeleteEvent,
    onUpdateEvent,
    setErrorMessage,
    searchQuery,
    filterService,
    filterStartDate,
    filterEndDate,
}) => {
    // Используем React Query хуки
    const { data: servicesData = [] } = useServices();
    const { data: workersData = [] } = useWorkers();

    // Мемоизация данных услуг и работников
    const { services, servicesColor } = useMemo(() => {
        const servicesMap = {};
        const servicesMapColor = {};
        servicesData.forEach((service) => {
            servicesMap[service.id] = service.name;
            servicesMapColor[service.id] = service.color;
        });
        return { services: servicesMap, servicesColor: servicesMapColor };
    }, [servicesData]);

    const worker = useMemo(() => {
        const workersMap = {};
        workersData.forEach((worker) => {
            workersMap[worker.id] = worker;
        });
        return workersMap;
    }, [workersData]);

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editEvent, setEditEvent] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [advanceManagerOpen, setAdvanceManagerOpen] = useState(false);
    const [advanceEvent, setAdvanceEvent] = useState(null);

    const {user} = useContext(GlobalContext);

    const formatDate = useCallback((dateValue, dateFormat = 'dd MMMM yyyy', localeObj = ru) => {
        if (!dateValue || !isValid(dateValue)) return 'Дата не указана';
        return format(dateValue, dateFormat, {locale: localeObj});
    }, []);

    // Мемоизация функций для предотвращения лишних ререндеров
    const openModal = useCallback((event) => {
        setSelectedEvent(event);
    }, []);

    const closeModal = useCallback(() => {
        setSelectedEvent(null);
    }, []);

    const openEditModal = useCallback((event) => {
        setEditEvent(event);
    }, []);

    const closeEditModal = useCallback(() => {
        setEditEvent(null);
    }, []);

    const handleDelete = useCallback((event) => {
        setConfirmDelete(event);
    }, []);

    const confirmDeleteEvent = useCallback(async () => {
        if (confirmDelete) {
            try {
                await deleteEvent(confirmDelete.id);
                onDeleteEvent(confirmDelete.id);
                setConfirmDelete(null);
            } catch (err) {
                console.error('Ошибка при удалении события:', err);
                setErrorMessage('Ошибка при удалении события');
                setConfirmDelete(null);
            }
        }
    }, [confirmDelete, onDeleteEvent, setErrorMessage]);

    const cancelDelete = useCallback(() => {
        setConfirmDelete(null);
    }, []);

    const openAdvanceManager = useCallback((event) => {
        setAdvanceEvent(event);
        setAdvanceManagerOpen(true);
    }, []);

    const closeAdvanceManager = useCallback(() => {
        setAdvanceManagerOpen(false);
        setAdvanceEvent(null);
    }, []);

    // Мемоизация проверок прав доступа
    const userIsAdmin = useMemo(() => isAdmin(user), [user]);
    const userCanManage = useMemo(() => canManageEvents(user), [user]);

    // Мемоизация фильтрации для оптимизации производительности
    const filteredEvents = useMemo(() => {
        // Создаем копию массива для сортировки (не мутируем оригинал)
        const sortedEvents = [...events].sort((a, b) => {
            if (a.created_at && b.created_at) {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            return b.id - a.id;
        });

        const searchLower = searchQuery.toLowerCase();
        
        return sortedEvents.filter((event) => {
            const matchesSearchQuery =
                event.client.name.toLowerCase().includes(searchLower) ||
                event.client.phones.some((phone) =>
                    phone.phone_number.includes(searchQuery)
                );

            const matchesService =
                filterService === '' ||
                event.devices.some((device) => device.service.toString() === filterService);

            const matchesDate =
                (filterStartDate === '' && filterEndDate === '') ||
                event.devices.some((device) => {
                    if (!device.event_service_date) return false;
                    const serviceDate = parseISO(device.event_service_date);
                    const startDate = filterStartDate ? parseISO(filterStartDate) : null;
                    const endDate = filterEndDate ? parseISO(filterEndDate) : null;

                    if (!isValid(serviceDate)) return false;

                    if (startDate && endDate) {
                        return isWithinInterval(serviceDate, {
                            start: startDate,
                            end: endDate,
                        });
                    } else if (startDate) {
                        return serviceDate >= startDate;
                    } else if (endDate) {
                        return serviceDate <= endDate;
                    }
                    return true;
                });

            return matchesSearchQuery && matchesService && matchesDate;
        });
    }, [events, searchQuery, filterService, filterStartDate, filterEndDate]);

    if (loading)
        return (
            <div className="flex justify-center items-center h-full">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );

    return (
        <div className="relative">
            {filteredEvents.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="bg-primary text-white text-primary-content">
                                <th>Клиент</th>
                                <th>Телефон</th>
                                <th>Услуга и дата</th>
                                <th className="text-center">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEvents.map((event, index) => (
                                <tr
                                    key={event.id}
                                    className={index % 2 === 0 ? 'bg-base-200' : ''}
                                >
                                    <td className="font-semibold">{event.client.name}</td>
                                    <td>
                                        {event.client.phones.map((phone) => (
                                            <div key={phone.id}>{phone.phone_number}</div>
                                        ))}
                                    </td>
                                    <td>
                                        {event.devices.map((device) => {
                                            let dateClass = '';
                                            let serviceDateText = 'Дата не указана';
                                            if (device.event_service_date) {
                                                const serviceDate = parseISO(device.event_service_date);

                                                if (isValid(serviceDate)) {
                                                    serviceDateText = formatDate(serviceDate, 'dd.MM.yyyy', ru);

                                                    if (isToday(serviceDate)) {
                                                        dateClass = 'text-success font-bold';
                                                    } else if (isTomorrow(serviceDate)) {
                                                        dateClass = 'text-warning font-bold';
                                                    }
                                                } else {
                                                    serviceDateText = 'Неверная дата';
                                                }
                                            }

                                            return (
                                                <div
                                                    key={device.id}
                                                    className="flex items-center space-x-2 my-1"
                                                >
                                                    <span
                                                        style={{
                                                            color: servicesColor[device.service],
                                                        }}
                                                        className="badge"
                                                    >
                                                        {services[device.service] || 'Услуга не найдена'}
                                                    </span>
                                                    <span className={`text-sm ${dateClass}`}>
                                                        {serviceDateText}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </td>
                                    <td className="flex justify-center space-x-2">
                                        <button
                                            className="btn btn-sm btn-info"
                                            onClick={() => openModal(event)}
                                            title="Просмотреть детали"
                                        >
                                            <FaInfoCircle className="text-white"/>
                                        </button>
                                        {userIsAdmin && (
                                            <button
                                                className="btn btn-sm btn-warning"
                                                onClick={() => openEditModal(event)}
                                                title="Редактировать"
                                            >
                                                <FaEdit className="text-white"/>
                                            </button>
                                        )}
                                        {userCanManage && (
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => openAdvanceManager(event)}
                                                title="Управление авансами"
                                            >
                                                <FaDollarSign className="text-white"/>
                                            </button>
                                        )}
                                        {userIsAdmin && (
                                            <button
                                                className="btn btn-sm btn-error"
                                                onClick={() => handleDelete(event)}
                                                title="Удалить"
                                            >
                                                <FaTrash className="text-white"/>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-xl mt-8">События не найдены</p>
            )}

            {/* Модальное окно деталей события */}
            {selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    services={services}
                    servicesColor={servicesColor}
                    workersMap={worker}
                    onClose={closeModal}
                />
            )}

            {/* Модальное окно редактирования события */}
            {editEvent && (
                <EditEventModal
                    event={editEvent}
                    services={services}
                    onClose={closeEditModal}
                    onUpdate={onUpdateEvent}
                    setErrorMessage={setErrorMessage}
                />
            )}

            {/* Модальное окно управления авансами */}
            {advanceManagerOpen && advanceEvent && (
                <AddAdvanceModal
                    event={advanceEvent}
                    onClose={closeAdvanceManager}
                    onUpdate={onUpdateEvent}
                    setErrorMessage={setErrorMessage}
                />
            )}

            {/* Модальное окно подтверждения удаления */}
            {confirmDelete && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Подтверждение удаления</h3>
                        <p className="py-4">
                            Вы уверены, что хотите удалить это событие?
                        </p>
                        <div className="modal-action">
                            <button className="btn" onClick={cancelDelete}>
                                Отмена
                            </button>
                            <button
                                className="btn btn-error text-white"
                                onClick={confirmDeleteEvent}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Мемоизация компонента для предотвращения лишних ререндеров
export default React.memo(EventList);
