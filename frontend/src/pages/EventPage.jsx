// EventPage.js
import React, {useContext, useEffect, useState} from 'react';
import AddEventModal from '../components/AddEventModal';
import EventCalendar from '../components/EventCalendar';
import {getEvents, getServices} from '../api';
import {GlobalContext} from "../components/BaseContex.jsx";
import EventList from "../components/EventList.jsx";
import {FaCalendarAlt, FaFilter, FaListUl, FaPlus, FaSearch} from "react-icons/fa";
import {canManageEvents} from "../utils/roles.js";

const EventPage = () => {
    // Ваши состояния и функции остаются без изменений
    const [modalVisible, setModalVisible] = useState(false);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Состояния для поиска и фильтров
    const [searchQuery, setSearchQuery] = useState('');
    const [filterService, setFilterService] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [services, setServices] = useState([]);

    // Состояние для переключения между списком и календарем
    const [viewMode, setViewMode] = useState('calendar');

    const {user} = useContext(GlobalContext)

    useEffect(() => {
        fetchEvents();
        fetchServices();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await getEvents();
            setEvents(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке событий:', error);
            setErrorMessage('Ошибка при загрузке событий');
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            const response = await getServices();
            setServices(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке услуг:', error);
            setErrorMessage('Ошибка при загрузке услуг');
        }
    };

    const handleAdd = () => {
        setModalVisible(true);
    };

    const handleCreate = (newEvent) => {
        setEvents((prevEvents) => [newEvent, ...prevEvents]);
        setModalVisible(false);
        setSuccessMessage('Событие успешно добавлено');
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    const handleDeleteEvent = (eventId) => {
        setEvents((prevEvents) =>
            prevEvents.filter((event) => event.id !== eventId)
        );
        setSuccessMessage('Событие успешно удалено');
    };

    const handleUpdateEvent = (updatedEvent) => {
        setEvents((prevEvents) =>
            prevEvents.map((event) =>
                event.id === updatedEvent.id ? updatedEvent : event
            )
        );
        setSuccessMessage('Событие успешно обновлено');
    };

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
                setErrorMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    const toggleViewMode = () => {
        setViewMode((prevMode) => (prevMode === 'list' ? 'calendar' : 'list'));
    };
    return (
        <div className="p-4 relative">
            {/* Сообщения об ошибке и успехе */}
            {errorMessage && (
                <div className="alert alert-error shadow-lg mb-4">
                    <div>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="stroke-current flex-shrink-0 h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728"
                            />
                        </svg>
                        <span>{errorMessage}</span>
                    </div>
                </div>
            )}
            {successMessage && (
                <div className="alert alert-success w-full md:w-[25%] shadow-lg mb-4 absolute  right-5">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="stroke-white flex-shrink-0 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    <span className="text-white">{successMessage}</span>
                </div>
            )}

            {/* Верхняя панель */}
            {canManageEvents(user) ? (
                <div className="flex flex-col justify-between xl:flex-row lg:flex-col lg:justify-between mb-4 gap-4">
                    {/* Левая часть: кнопки */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button
                            className="btn btn-success text-white w-full sm:w-auto flex items-center justify-center gap-2"
                            onClick={handleAdd}
                        >
                            <FaPlus/>
                            <span>Добавить событие</span>
                        </button>
                        {/* Кнопка переключения представления */}
                        <button
                            className="btn bg-gray-200 hover:bg-gray-300 text-gray-700 w-full sm:w-auto flex items-center justify-center gap-2"
                            onClick={toggleViewMode}
                        >
                            {viewMode === 'list' ? (
                                <>
                                    <FaCalendarAlt/>
                                    <span>Календарь</span>
                                </>
                            ) : (
                                <>
                                    <FaListUl/>
                                    <span>Список</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Правая часть: фильтры */}
                    <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-2">
                        {/* Поиск */}
                        <div
                            className="group flex items-center border rounded-lg px-3 py-2 w-full md:w-auto hover:border-green-400">
                            <FaSearch className="text-gray-500 mr-2 group-hover:text-green-400"/>
                            <input
                                type="text"
                                placeholder="Поиск"
                                className="bg-transparent group-hover:placeholder:text-green-400 focus:outline-none w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Фильтр по услуге */}
                        <div
                            className="group flex items-center border rounded-lg px-3 py-2 w-full md:w-auto hover:border-green-400">
                            <FaFilter className="text-gray-500 group-hover:text-green-400 mr-2"/>
                            <select
                                className="bg-transparent group-hover:text-green-400 focus:outline-none w-full"
                                value={filterService}
                                onChange={(e) => setFilterService(e.target.value)}
                            >
                                <option value="">Все услуги</option>
                                {services.map((service) => (
                                    <option key={service.id} value={service.id}>
                                        {service.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Фильтр по дате услуги */}
                        <div
                            className="group hover:border-green-400 flex items-center border rounded-lg px-3 py-2 w-full md:w-auto">
                            <input
                                type="date"
                                className="bg-transparent group-hover:text-green-400 focus:outline-none w-full"
                                value={filterStartDate}
                                onChange={(e) => setFilterStartDate(e.target.value)}
                            />
                            <span className="mx-2 text-gray-500 group-hover:text-green-400">-</span>
                            <input
                                type="date"
                                className="bg-transparent group-hover:text-green-400 focus:outline-none w-full"
                                value={filterEndDate}
                                onChange={(e) => setFilterEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            ): ''}

            {/* Отображаем либо EventList, либо EventCalendar в зависимости от состояния viewMode */}
            {viewMode === 'calendar' && canManageEvents(user) ? (
                <EventList
                    events={events}
                    loading={loading}
                    onDeleteEvent={handleDeleteEvent}
                    onUpdateEvent={handleUpdateEvent}
                    setErrorMessage={setErrorMessage}
                    searchQuery={searchQuery}
                    filterService={filterService}
                    filterStartDate={filterStartDate}
                    filterEndDate={filterEndDate}
                />
            ) : (

                <EventCalendar
                    events={events}
                    loading={loading}
                    onDeleteEvent={handleDeleteEvent}
                    onUpdateEvent={handleUpdateEvent}
                    setErrorMessage={setErrorMessage}
                    services={services}
                    searchQuery={searchQuery}
                    filterService={filterService}
                    filterStartDate={filterStartDate}
                    filterEndDate={filterEndDate}
                />
            )}

            {/* Модальное окно добавления события */}
            {modalVisible && (
                <AddEventModal
                    onClose={handleCancel}
                    onSave={handleCreate}
                    setErrorMessage={setErrorMessage}
                />
            )}
        </div>
    );
};

export default EventPage;
