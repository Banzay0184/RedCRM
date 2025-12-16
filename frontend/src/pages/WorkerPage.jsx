import React, { useState, useMemo, useEffect } from 'react';
import { useWorkers, useWorkerDetail } from '../hooks/useWorkers';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture, isValid, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FaUser, FaPhone, FaTasks, FaCalendarAlt, FaChevronRight, FaCircle } from 'react-icons/fa';

const WorkerPage = () => {
    const [selectedWorkerId, setSelectedWorkerId] = useState(null);
    const { data: workers = [], isLoading: workersLoading } = useWorkers();
    const { data: workerDetail, isLoading: detailLoading } = useWorkerDetail(selectedWorkerId);

    // Фильтр по датам для карточки работника
    const [filterMode, setFilterMode] = useState('all'); // all | month | range
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // При выборе "Этот месяц" автоматически выставляем даты начала/конца месяца
    useEffect(() => {
        if (filterMode === 'month') {
            const now = new Date();
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            setFilterStartDate(format(start, 'yyyy-MM-dd'));
            setFilterEndDate(format(end, 'yyyy-MM-dd'));
        } else if (filterMode === 'all') {
            setFilterStartDate('');
            setFilterEndDate('');
        }
    }, [filterMode]);

    // Выбранные услуги (тип работ) для фильтрации внутри карточки работника
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);

    // Услуги, с которыми работал выбранный работник (для списка фильтров)
    const workerServices = useMemo(() => {
        if (!workerDetail?.devices) return [];
        const map = new Map();
        workerDetail.devices.forEach((device) => {
            if (device.service && device.service.id && !map.has(device.service.id)) {
                map.set(device.service.id, {
                    id: device.service.id,
                    name: device.service.name,
                    color: device.service.color,
                });
            }
        });
        return Array.from(map.values());
    }, [workerDetail]);

    // Группируем устройства по мероприятиям и определяем статус
    const eventsMap = useMemo(() => {
        if (!workerDetail?.devices) return {};
        
        const map = {};
        workerDetail.devices.forEach(device => {
            const eventId = device.event_id;
            if (!map[eventId]) {
                // Определяем ближайшую дату мероприятия из всех устройств
                const deviceDates = workerDetail.devices
                    .filter(d => d.event_id === eventId && d.event_service_date)
                    .map(d => {
                        try {
                            // Пробуем разные форматы даты
                            const dateStr = d.event_service_date;
                            if (typeof dateStr === 'string') {
                                // Если это строка в формате YYYY-MM-DD
                                const parsed = parseISO(dateStr);
                                if (isValid(parsed)) {
                                    return parsed;
                                }
                                // Если не получилось, пробуем как Date
                                const dateObj = new Date(dateStr);
                                if (isValid(dateObj)) {
                                    return dateObj;
                                }
                            }
                            return null;
                        } catch {
                            return null;
                        }
                    })
                    .filter(d => d && isValid(d));
                
                const nearestDate = deviceDates.length > 0 
                    ? deviceDates.sort((a, b) => a.getTime() - b.getTime())[0]
                    : null;
                
                // Определяем статус мероприятия
                let isPastEvent = false;
                let isFutureEvent = false;
                
                if (nearestDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const nearestDateOnly = new Date(nearestDate);
                    nearestDateOnly.setHours(0, 0, 0, 0);
                    
                    if (isToday(nearestDate) || isTomorrow(nearestDate) || nearestDateOnly > today) {
                        isFutureEvent = true;
                    } else if (nearestDateOnly < today) {
                        isPastEvent = true;
                    } else {
                        // Если дата сегодня, считаем будущим
                        isFutureEvent = true;
                    }
                } else {
                    // Если нет даты, используем created_at
                    const createdDate = new Date(device.event_created_at);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const createdDateOnly = new Date(createdDate);
                    createdDateOnly.setHours(0, 0, 0, 0);
                    
                    if (createdDateOnly >= today) {
                        isFutureEvent = true;
                    } else {
                        isPastEvent = true;
                    }
                }
                
                map[eventId] = {
                    event_id: eventId,
                    client_name: device.event_client_name,
                    amount: device.event_amount,
                    created_at: device.event_created_at,
                    nearest_date: nearestDate,
                    is_past: isPastEvent,
                    is_future: isFutureEvent,
                    devices: []
                };
            }
            map[eventId].devices.push(device);
        });
        return map;
    }, [workerDetail]);

    // Применяем фильтр по датам и услугам к мероприятиям работника
    const filteredEventsList = useMemo(() => {
        const events = Object.values(eventsMap);

        const start = filterStartDate ? parseISO(filterStartDate) : null;
        const end = filterEndDate ? parseISO(filterEndDate) : null;
        const hasDateFilter = !!(start || end);
        const hasServiceFilter = Array.isArray(selectedServiceIds) && selectedServiceIds.length > 0;

        return events.filter((ev) => {
            // Фильтр по дате
            if (hasDateFilter) {
                const baseDate = ev.nearest_date ? ev.nearest_date : new Date(ev.created_at);
                if (!isValid(baseDate)) return false;

                if (start && end) {
                    if (!isWithinInterval(baseDate, { start, end })) return false;
                } else if (start) {
                    if (baseDate < start) return false;
                } else if (end) {
                    if (baseDate > end) return false;
                }
            }

            // Фильтр по услугам (типам работ)
            if (hasServiceFilter) {
                const hasSelectedService = ev.devices?.some(
                    (device) => device.service && selectedServiceIds.includes(device.service.id)
                );
                if (!hasSelectedService) return false;
            }

            return true;
        });
    }, [eventsMap, filterStartDate, filterEndDate, selectedServiceIds]);

    // Разделяем отфильтрованные мероприятия на будущие и прошедшие
    const { futureEvents, pastEvents } = useMemo(() => {
        const events = filteredEventsList;
        const future = events
            .filter(e => e.is_future)
            .sort((a, b) => {
                if (a.nearest_date && b.nearest_date) {
                    return a.nearest_date.getTime() - b.nearest_date.getTime();
                }
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        const past = events
            .filter(e => e.is_past)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { futureEvents: future, pastEvents: past };
    }, [filteredEventsList]);

    // Статистика по отфильтрованным мероприятиям (для выбранного периода)
    const filteredStats = useMemo(() => {
        if (!workerDetail) {
            return { tasks: 0, events: 0 };
        }

        const eventIds = new Set();
        let tasksCount = 0;

        filteredEventsList.forEach((ev) => {
            eventIds.add(ev.event_id);
            if (Array.isArray(ev.devices)) {
                ev.devices.forEach((device) => {
                    if (
                        !Array.isArray(selectedServiceIds) ||
                        selectedServiceIds.length === 0 ||
                        (device.service && selectedServiceIds.includes(device.service.id))
                    ) {
                        tasksCount += 1;
                    }
                });
            }
        });

        return {
            tasks: tasksCount,
            events: eventIds.size,
        };
    }, [filteredEventsList, workerDetail, selectedServiceIds]);

    // Сортируем работников: сначала с зелёным индикатором (сегодня), потом жёлтым (завтра), потом остальные
    const sortedWorkers = useMemo(() => {
        return [...workers].sort((a, b) => {
            // Приоритет 1: работники с мероприятием сегодня (зелёный)
            if (a.has_event_today && !b.has_event_today) return -1;
            if (!a.has_event_today && b.has_event_today) return 1;
            
            // Приоритет 2: работники с мероприятием завтра (жёлтый)
            if (a.has_event_tomorrow && !b.has_event_tomorrow) return -1;
            if (!a.has_event_tomorrow && b.has_event_tomorrow) return 1;
            
            // Приоритет 3: сортировка по order (если есть)
            if (a.order !== null && b.order !== null) {
                return a.order - b.order;
            }
            if (a.order !== null) return -1;
            if (b.order !== null) return 1;
            
            // Приоритет 4: сортировка по имени
            return a.name.localeCompare(b.name);
        });
    }, [workers]);

    if (workersLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Управление работниками</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Список работников */}
                <div className="lg:col-span-1">
                    <div className="bg-base-200 rounded-lg p-4 shadow-lg sticky top-4">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <FaUser className="text-primary" />
                            Работники
                        </h2>
                        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                            {sortedWorkers.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">Нет работников</p>
                            ) : (
                                sortedWorkers.map((worker) => {
                                    // Определяем индикатор статуса
                                    let statusIndicator = null;
                                    if (worker.has_event_today) {
                                        statusIndicator = <FaCircle className="text-green-500 text-sm" title="Мероприятие сегодня" />;
                                    } else if (worker.has_event_tomorrow) {
                                        statusIndicator = <FaCircle className="text-yellow-500 text-sm" title="Мероприятие завтра" />;
                                    }
                                    
                                    return (
                                        <div
                                            key={worker.id}
                                            onClick={() => setSelectedWorkerId(worker.id)}
                                            className={`p-4 rounded-lg cursor-pointer transition-all ${
                                                selectedWorkerId === worker.id
                                                    ? 'bg-primary text-primary-content shadow-md'
                                                    : 'bg-base-100 hover:bg-base-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-1">
                                                    {statusIndicator}
                                                    <div>
                                                        <h3 className="font-semibold">{worker.name}</h3>
                                                        {worker.phone_number && (
                                                            <p className="text-sm opacity-80 flex items-center gap-1 mt-1">
                                                                <FaPhone className="text-xs" />
                                                                {worker.phone_number}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <FaChevronRight 
                                                    className={selectedWorkerId === worker.id ? 'text-primary-content' : 'text-gray-400'}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Детальная информация о работнике */}
                <div className="lg:col-span-2">
                    {!selectedWorkerId ? (
                        <div className="bg-base-200 rounded-lg p-8 text-center">
                            <FaUser className="text-6xl text-gray-400 mx-auto mb-4" />
                            <p className="text-xl text-gray-500">Выберите работника для просмотра информации</p>
                        </div>
                    ) : detailLoading ? (
                        <div className="flex justify-center items-center h-full min-h-[400px]">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : workerDetail ? (
                        <div className="space-y-6">
                            {/* Информация о работнике */}
                            <div className="bg-base-200 rounded-lg p-6 shadow-lg">
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <FaUser className="text-primary" />
                                    {workerDetail.name}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {workerDetail.phone_number && (
                                        <div className="flex items-center gap-2">
                                            <FaPhone className="text-primary" />
                                            <span className="font-semibold">Телефон:</span>
                                            <span>{workerDetail.phone_number}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <FaTasks className="text-primary" />
                                        <span className="font-semibold">Задач (в периоде):</span>
                                        <span>{filteredStats.tasks || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FaCalendarAlt className="text-primary" />
                                        <span className="font-semibold">Мероприятий (в периоде):</span>
                                        <span>{filteredStats.events || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Список мероприятий */}
                            {(futureEvents.length > 0 || pastEvents.length > 0) ? (
                                <div className="space-y-6">
                                    {/* Фильтры по дате внутри карточки работника */}
                                    <div className="bg-base-200 rounded-lg p-4 shadow-md space-y-4">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                <FaCalendarAlt className="text-primary" />
                                                Фильтр по датам
                                            </h3>
                                            <div className="flex flex-wrap gap-4 items-end">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-outline'}`}
                                                        onClick={() => setFilterMode('all')}
                                                    >
                                                        Все
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn btn-sm ${filterMode === 'month' ? 'btn-primary' : 'btn-outline'}`}
                                                        onClick={() => setFilterMode('month')}
                                                    >
                                                        Этот месяц
                                                    </button>
                                                </div>
                                                <div className="form-control">
                                                    <label className="label">
                                                        <span className="label-text text-sm">С даты</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="input input-sm input-bordered"
                                                        value={filterStartDate}
                                                        onChange={(e) => {
                                                            setFilterMode('range');
                                                            setFilterStartDate(e.target.value);
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-control">
                                                    <label className="label">
                                                        <span className="label-text text-sm">По дату</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="input input-sm input-bordered"
                                                        value={filterEndDate}
                                                        onChange={(e) => {
                                                            setFilterMode('range');
                                                            setFilterEndDate(e.target.value);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {workerServices.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-semibold mb-2">
                                                    Фильтр по услугам (типам работ)
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {workerServices.map((service) => {
                                                        const isSelected = selectedServiceIds.includes(service.id);
                                                        return (
                                                            <button
                                                                key={service.id}
                                                                type="button"
                                                                className={`badge badge-lg cursor-pointer border-1 border-white ${
                                                                    isSelected
                                                                        ? 'badge-primary border-primary text-white'
                                                                        : 'badge-ghost border-base-300'
                                                                }`}
                                                                onClick={() => {
                                                                    setSelectedServiceIds((prev) => {
                                                                        if (prev.includes(service.id)) {
                                                                            return prev.filter((id) => id !== service.id);
                                                                        }
                                                                        return [...prev, service.id];
                                                                    });
                                                                }}
                                                            >
                                                                {service.name}
                                                            </button>
                                                        );
                                                    })}
                                                    {selectedServiceIds.length > 0 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-ghost ml-2"
                                                            onClick={() => setSelectedServiceIds([])}
                                                        >
                                                            Сбросить услуги
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Будущие мероприятия */}
                                    {futureEvents.length > 0 && (
                                        <div className="bg-base-200 rounded-lg p-6 shadow-lg">
                                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                                <FaCalendarAlt className="text-primary" />
                                                Предстоящие мероприятия
                                            </h3>
                                            <div className="space-y-4">
                                                {futureEvents.map((event) => (
                                                    <div
                                                        key={event.event_id}
                                                        className="bg-base-100 rounded-lg p-4 border-l-4 border-green-500"
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-lg font-semibold">{event.client_name}</h4>
                                                            <div className="flex flex-col items-end gap-1">
                                                                {event.nearest_date && (
                                                                    <span className={`text-sm font-semibold ${
                                                                        isToday(event.nearest_date) ? 'text-green-600' :
                                                                        isTomorrow(event.nearest_date) ? 'text-yellow-600' :
                                                                        'text-gray-600'
                                                                    }`}>
                                                                        {isToday(event.nearest_date) ? 'Сегодня' :
                                                                         isTomorrow(event.nearest_date) ? 'Завтра' :
                                                                         format(event.nearest_date, 'dd.MM.yyyy', { locale: ru })}
                                                                    </span>
                                                                )}
                                                                <span className="text-sm text-gray-500">
                                                                    {format(new Date(event.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                <div className="mb-3">
                                                    <span className="font-semibold">Сумма:</span>
                                                    <span className="ml-2">{event.amount?.toLocaleString()} сум</span>
                                                </div>
                                                
                                                {/* Задачи в этом мероприятии */}
                                                <div className="mt-3">
                                                    <h5 className="font-semibold mb-2 flex items-center gap-2">
                                                        <FaTasks className="text-sm" />
                                                        Задачи:
                                                    </h5>
                                                <div className="space-y-2">
                                                    {event.devices
                                                        .filter((device) =>
                                                            !Array.isArray(selectedServiceIds) ||
                                                            selectedServiceIds.length === 0 ||
                                                            (device.service && selectedServiceIds.includes(device.service.id))
                                                        )
                                                        .map((device) => (
                                                            <div
                                                                key={device.id}
                                                                className="bg-base-200 rounded p-3 ml-4"
                                                            >
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div
                                                                        className="w-4 h-4 rounded"
                                                                        style={{ backgroundColor: device.service?.color || '#000' }}
                                                                    ></div>
                                                                    <span className="font-semibold">{device.service?.name}</span>
                                                                </div>
                                                                {device.restaurant_name && (
                                                                    <p className="text-sm text-gray-600">
                                                                        <span className="font-semibold">Ресторан:</span> {device.restaurant_name}
                                                                    </p>
                                                                )}
                                                                {device.camera_count > 0 && (
                                                                    <p className="text-sm text-gray-600">
                                                                        <span className="font-semibold">Камер:</span> {device.camera_count}
                                                                    </p>
                                                                )}
                                                                {device.event_service_date && (
                                                                    <p className="text-sm text-gray-600">
                                                                        <span className="font-semibold">Дата:</span>{' '}
                                                                        {format(new Date(device.event_service_date), 'dd.MM.yyyy', { locale: ru })}
                                                                    </p>
                                                                )}
                                                                {device.comment && (
                                                                    <p className="text-sm text-gray-600 mt-1">
                                                                        <span className="font-semibold">Комментарий:</span> {device.comment}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Прошедшие мероприятия */}
                                    {pastEvents.length > 0 && (
                                        <div className="bg-base-200 rounded-lg p-6 shadow-lg">
                                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                                <FaCalendarAlt className="text-gray-500" />
                                                Прошедшие мероприятия
                                            </h3>
                                            <div className="space-y-4">
                                                {pastEvents.map((event) => (
                                                    <div
                                                        key={event.event_id}
                                                        className="bg-base-100 rounded-lg p-4 border-l-4 border-gray-400 opacity-75"
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-lg font-semibold">{event.client_name}</h4>
                                                            <div className="flex flex-col items-end gap-1">
                                                                {event.nearest_date && (
                                                                    <span className="text-sm text-gray-600">
                                                                        {format(event.nearest_date, 'dd.MM.yyyy', { locale: ru })}
                                                                    </span>
                                                                )}
                                                                <span className="text-sm text-gray-500">
                                                                    {format(new Date(event.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <span className="font-semibold">Сумма:</span>
                                                            <span className="ml-2">{event.amount?.toLocaleString()} сум</span>
                                                        </div>
                                                        
                                                        {/* Задачи в этом мероприятии */}
                                                        <div className="mt-3">
                                                            <h5 className="font-semibold mb-2 flex items-center gap-2">
                                                                <FaTasks className="text-sm" />
                                                                Задачи:
                                                            </h5>
                                                <div className="space-y-2">
                                                                {event.devices
                                                                    .filter((device) =>
                                                                        !Array.isArray(selectedServiceIds) ||
                                                                        selectedServiceIds.length === 0 ||
                                                                        (device.service && selectedServiceIds.includes(device.service.id))
                                                                    )
                                                                    .map((device) => (
                                                                    <div
                                                                        key={device.id}
                                                                        className="bg-base-200 rounded p-3 ml-4"
                                                                    >
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <div
                                                                                className="w-4 h-4 rounded"
                                                                                style={{ backgroundColor: device.service?.color || '#000' }}
                                                                            ></div>
                                                                            <span className="font-semibold">{device.service?.name}</span>
                                                                        </div>
                                                                        {device.restaurant_name && (
                                                                            <p className="text-sm text-gray-600">
                                                                                <span className="font-semibold">Ресторан:</span> {device.restaurant_name}
                                                                            </p>
                                                                        )}
                                                                        {device.camera_count > 0 && (
                                                                            <p className="text-sm text-gray-600">
                                                                                <span className="font-semibold">Камер:</span> {device.camera_count}
                                                                            </p>
                                                                        )}
                                                                        {device.event_service_date && (
                                                                            <p className="text-sm text-gray-600">
                                                                                <span className="font-semibold">Дата:</span>{' '}
                                                                                {format(new Date(device.event_service_date), 'dd.MM.yyyy', { locale: ru })}
                                                                            </p>
                                                                        )}
                                                                        {device.comment && (
                                                                            <p className="text-sm text-gray-600 mt-1">
                                                                                <span className="font-semibold">Комментарий:</span> {device.comment}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-base-200 rounded-lg p-8 text-center">
                                    <FaCalendarAlt className="text-6xl text-gray-400 mx-auto mb-4" />
                                    <p className="text-xl text-gray-500">У этого работника нет мероприятий</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-base-200 rounded-lg p-8 text-center">
                            <p className="text-xl text-gray-500">Не удалось загрузить информацию о работнике</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkerPage;

