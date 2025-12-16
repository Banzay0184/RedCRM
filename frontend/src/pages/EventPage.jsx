// EventPage.js
import React, {useContext, useState, useMemo, useCallback, useEffect} from 'react';
import AddEventModal from '../components/AddEventModal';
import EventCalendar from '../components/EventCalendar';
import {GlobalContext} from "../components/BaseContex.jsx";
import EventList from "../components/EventList.jsx";
import {FaCalendarAlt, FaFilter, FaListUl, FaPlus, FaSearch} from "react-icons/fa";
import {canManageEvents} from "../utils/roles.js";
import {useDebounce} from "../utils/debounce.js";
import {useEvents, useCreateEvent, useDeleteEvent, useUpdateEvent} from '../hooks/useEvents';
import {useServices} from '../hooks/useServices';
import {toast} from 'react-hot-toast';
import Pagination from '../components/Pagination';

const EventPage = () => {
    // Состояние для пагинации
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Состояние для переключения между списком и календарем (должно быть объявлено до использования)
    const [viewMode, setViewMode] = useState('calendar');

    // Состояния
    const [modalVisible, setModalVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    console.log(successMessage, errorMessage);

    // Состояния для поиска и фильтров
    const [searchQuery, setSearchQuery] = useState('');
    const [filterService, setFilterService] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // Debounce для поиска (оптимизация производительности)
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Определяем, есть ли активные фильтры
    const hasActiveFilters = useMemo(() => {
        return !!(
            debouncedSearchQuery.trim() || 
            filterService || 
            filterStartDate || 
            filterEndDate
        );
    }, [debouncedSearchQuery, filterService, filterStartDate, filterEndDate]);

    // Для календаря всегда отключаем пагинацию, для списка - только при фильтрах
    const shouldUsePagination = viewMode === 'list' && !hasActiveFilters;

    // Используем React Query хуки с пагинацией
    const { data: eventsData, isLoading: loading, error: eventsError } = useEvents(
        currentPage, 
        pageSize, 
        shouldUsePagination // Пагинация только для списка без фильтров
    );
    const { data: services = [] } = useServices();
    
    // Извлекаем данные и пагинацию
    let events = eventsData?.data || [];
    
    // Сортируем события по дате создания (сначала новые)
    events = useMemo(() => {
        return [...events].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
            const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
            return dateB - dateA; // Сначала новые
        });
    }, [events]);
    
    const pagination = shouldUsePagination ? eventsData?.pagination : null;
    
    const createEventMutation = useCreateEvent();
    const updateEventMutation = useUpdateEvent();
    const deleteEventMutation = useDeleteEvent();

    const {user} = useContext(GlobalContext);

    // Обработка ошибок
    useEffect(() => {
        if (eventsError) {
            setErrorMessage('Ошибка при загрузке событий');
            toast.error('Ошибка при загрузке событий');
        }
    }, [eventsError]);

    // Мемоизация функций для предотвращения лишних ререндеров
    const handleAdd = useCallback(() => {
        setModalVisible(true);
    }, []);

    const handleCreate = useCallback(async (newEventData) => {
        try {
            const response = await createEventMutation.mutateAsync(newEventData);
            setModalVisible(false);
            setSuccessMessage('Событие успешно добавлено');
            toast.success('Событие успешно добавлено');
        } catch (error) {
            console.error('Ошибка при создании события:', error);
            setErrorMessage('Ошибка при создании события');
            toast.error('Ошибка при создании события');
        }
    }, [createEventMutation]);

    const handleCancel = useCallback(() => {
        setModalVisible(false);
    }, []);

    const handleDeleteEvent = useCallback(async (eventId) => {
        try {
            await deleteEventMutation.mutateAsync(eventId);
            setSuccessMessage('Событие успешно удалено');
            toast.success('Событие успешно удалено');
        } catch (error) {
            console.error('Ошибка при удалении события:', error);
            setErrorMessage('Ошибка при удалении события');
            toast.error('Ошибка при удалении события');
        }
    }, [deleteEventMutation]);

    const handleUpdateEvent = useCallback(async (updatedEvent) => {
        try {
            await updateEventMutation.mutateAsync({
                id: updatedEvent.id,
                data: updatedEvent
            });
            setSuccessMessage('Событие успешно обновлено');
            toast.success('Событие успешно обновлено');
        } catch (error) {
            console.error('Ошибка при обновлении события:', error);
            setErrorMessage('Ошибка при обновлении события');
            toast.error('Ошибка при обновлении события');
        }
    }, [updateEventMutation]);

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
                setErrorMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    const toggleViewMode = useCallback(() => {
        setViewMode((prevMode) => (prevMode === 'list' ? 'calendar' : 'list'));
    }, []);

    // Обработчик изменения страницы
    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
        // Прокручиваем вверх при смене страницы
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Сброс на первую страницу при изменении фильтров
    useEffect(() => {
        if (hasActiveFilters) {
            setCurrentPage(1);
        }
    }, [hasActiveFilters]);

    // Мемоизация для предотвращения лишних ререндеров дочерних компонентов
    const canManage = useMemo(() => canManageEvents(user), [user]);
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
                                {services && services.map((service) => (
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
            {viewMode === 'calendar' ? (
                <EventCalendar
                    events={events}
                    loading={loading}
                    onDeleteEvent={handleDeleteEvent}
                    onUpdateEvent={handleUpdateEvent}
                    setErrorMessage={setErrorMessage}
                    services={services}
                    searchQuery={debouncedSearchQuery}
                    filterService={filterService}
                    filterStartDate={filterStartDate}
                    filterEndDate={filterEndDate}
                />
            ) : (
                <>
                    <EventList
                        events={events}
                        loading={loading}
                        onDeleteEvent={handleDeleteEvent}
                        onUpdateEvent={handleUpdateEvent}
                        setErrorMessage={setErrorMessage}
                        searchQuery={debouncedSearchQuery}
                        filterService={filterService}
                        filterStartDate={filterStartDate}
                        filterEndDate={filterEndDate}
                    />
                    {/* Компонент пагинации - показываем только если нет активных фильтров */}
                    {pagination && !hasActiveFilters && (
                        <Pagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                        />
                    )}
                    
                    {/* Информация о количестве результатов при фильтрации */}
                    {hasActiveFilters && events.length > 0 && (
                        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                            Найдено событий: {events.length}
                        </div>
                    )}
                </>
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
