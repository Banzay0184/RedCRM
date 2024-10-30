import React, {useState} from 'react';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    isWithinInterval,
    parseISO,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import {ru} from 'date-fns/locale';
import {FaArrowLeft, FaArrowRight, FaCalendarAlt,} from 'react-icons/fa';
import EventCalendarModal from './EventCalendarModal';

const EventCalendar = ({
                           events,
                           services,
                           searchQuery,
                           filterService,
                           filterStartDate,
                           filterEndDate,
                       }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDayEvents, setSelectedDayEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isModalOpen, setModalOpen] = useState(false);


    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, {weekStartsOn: 1});
    const endDate = endOfWeek(monthEnd, {weekStartsOn: 1});

    // Создаем servicesMap
    const servicesMap = services.reduce((map, service) => {
        map[service.id] = service.name;
        return map;
    }, {});

    // Функция для переключения месяца
    const handleMonthChange = (direction) => {
        const newDate = addMonths(currentMonth, direction);
        setCurrentMonth(newDate);
    };

    // Открыть модальное окно для выбранного дня
    const openModal = (events, date) => {
        setSelectedDayEvents(events);
        setSelectedDate(date);
        setModalOpen(true);
    };

    // Закрыть модальное окно
    const closeModal = () => {
        setModalOpen(false);
        setSelectedDayEvents([]);
        setSelectedDate(null);
    };

    // Функция для фильтрации событий
    const filterEvents = () => {
        return events.filter((event) => {
            // Поиск по имени клиента или номеру телефона
            const matchesSearchQuery =
                event.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                event.client.phones.some((phone) =>
                    phone.phone_number.includes(searchQuery)
                );

            // Фильтр по услуге
            const matchesService =
                filterService === '' ||
                event.devices.some(
                    (device) => device.service.toString() === filterService
                );

            // Фильтр по дате услуги
            const matchesDate =
                (filterStartDate === '' && filterEndDate === '') ||
                event.devices.some((device) => {
                    if (!device.event_service_date) return false;
                    const serviceDate = parseISO(device.event_service_date);
                    const startDate = filterStartDate ? parseISO(filterStartDate) : null;
                    const endDate = filterEndDate ? parseISO(filterEndDate) : null;

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
    };

    const filteredEvents = filterEvents();

    // Генерация дней с событиями
    const renderDays = () => {
        const days = [];
        let day = startDate;


        while (day <= endDate) {
            const formattedDate = format(day, 'yyyy-MM-dd');

            // Фильтруем события на текущий день
            const dayEvents = filteredEvents.filter((event) =>
                event.devices.some((device) => {
                    if (!device.event_service_date) return false;
                    const serviceDate = parseISO(device.event_service_date);
                    return isSameDay(serviceDate, day);
                })
            );

            // Проверяем, является ли день сегодняшним
            const todayClass = isToday(day)
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full p-2 shadow-lg transition duration-300'
                : 'hover:bg-gradient-to-r hover:from-indigo-100 hover:to-purple-100 transition duration-300';

            const notCurrentMonthClass = !isSameMonth(day, currentMonth)
                ? 'text-gray-400'
                : '';

            days.push(
                <div
                    key={formattedDate}
                    className={`flex flex-col items-center justify-center h-20 sm:h-24 md:h-28 lg:h-28 border p-1 rounded-lg ${notCurrentMonthClass} ${todayClass}`}
                >
                    <div className="text-sm sm:text-base md:text-lg font-bold">
                        {format(day, 'd')}
                    </div>
                    {dayEvents.length > 0 && (
                        <button
                            onClick={() => {
                                openModal(dayEvents, day);
                            }}
                            className="mt-1 text-white bg-indigo-800 rounded-full p-1 sm:p-2 shadow-lg hover:bg-indigo-600 transition duration-300"
                        >
                            <FaCalendarAlt className="text-base sm:text-lg md:text-xl"/>
                        </button>
                    )}
                </div>
            );
            day = addDays(day, 1);
        }

        return days;
    };


    return (
        <div className="p-2 sm:p-4">
            {/* Календарь */}
            <div className="flex flex-col md:flex-row md:justify-between items-center mb-4 sm:mb-6">
                {/* Название месяца */}
                <div
                    className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500 mb-4 md:mb-0">
                    {format(currentMonth, 'MMMM yyyy', {locale: ru})}
                </div>

                {/* Кнопки навигации */}
                <div className="flex space-x-3">
                    <FaArrowLeft
                        className="text-indigo-500 text-2xl cursor-pointer hover:text-indigo-700 transition duration-200"
                        onClick={() => handleMonthChange(-1)}
                    />
                    <FaArrowRight
                        className="text-indigo-500 text-2xl cursor-pointer hover:text-indigo-700 transition duration-200"
                        onClick={() => handleMonthChange(1)}
                    />
                </div>
            </div>

            {/* Сетка календаря */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4">
                {/* Заголовки дней недели */}
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName, index) => (
                    <div
                        key={index}
                        className="text-center font-semibold text-indigo-500 text-xs sm:text-sm md:text-base"
                    >
                        {dayName}
                    </div>
                ))}

                {/* Дни месяца */}
                {renderDays()}
            </div>

            {/* Модальное окно для событий дня */}
            {isModalOpen && (
                <EventCalendarModal onClose={closeModal}>
                    <div className="p-4">
                        {/*<h2 className="text-lg font-bold mb-4">*/}
                        {/*  События на {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}*/}
                        {/*</h2>*/}
                        <ul>
                            {selectedDayEvents.map((event, index) => (
                                <li
                                    key={index}
                                    className="mb-2 flex flex-col sm:flex-row items-start justify-between"
                                >
                                    <div>
                                        <label className=' font-semibold text-black' >Клиент: </label>
                                        <span className="font-semibold text-indigo-500 ">{event.client.name}</span>
                                        {event.devices.map((device) => {
                                            if (!device.event_service_date) return null;
                                            const serviceDate = parseISO(device.event_service_date);
                                            if (isSameDay(serviceDate, selectedDate)) {
                                                return (
                                                    <div key={device.id}>
                            <span className="badge badge-info">
                              {servicesMap[device.service] ||
                                  'Услуга не найдена'}
                            </span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                    {/*<button className="text-indigo-500 flex items-center space-x-2 mt-2 sm:mt-0">*/}
                                    {/*  <FaInfoCircle />*/}
                                    {/*  <span>Детально</span>*/}
                                    {/*</button>*/}
                                </li>
                            ))}
                        </ul>
                    </div>
                </EventCalendarModal>
            )}
        </div>
    );
};

export default EventCalendar;
