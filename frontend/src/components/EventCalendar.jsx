import React, {useEffect, useMemo, useState} from 'react';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isSameMonth,
    isToday,
    parse,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import {ru} from 'date-fns/locale';
import {FaArrowLeft, FaArrowRight, FaCalendarAlt} from 'react-icons/fa';
import {getWorkers} from "../api.js";

const EventCalendar = ({
                           events,
                           services,
                           searchQuery,
                           filterService,
                           filterStartDate,
                           filterEndDate,
                       }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [workersList, setWorkersList] = useState([]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, {weekStartsOn: 1});
    const endDate = endOfWeek(monthEnd, {weekStartsOn: 1});

    const servicesMap = services.reduce((map, service) => {
        map[service.id] = service;
        return map;
    }, {});

    const formatCurrency = (number, isUSD) =>
        new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: isUSD ? 'USD' : 'UZS',
            minimumFractionDigits: isUSD ? 2 : 0,
            maximumFractionDigits: isUSD ? 2 : 0,
        }).format(number);

    const devicesWithDate = events.reduce((acc, event) => {
        event.devices.forEach((device) => {
            if (device.event_service_date) {
                let deviceDate = parse(device.event_service_date, 'yyyy-MM-dd', new Date());
                if (isNaN(deviceDate)) {
                    deviceDate = parse(device.event_service_date, 'dd.MM.yyyy', new Date());
                }
                if (!isNaN(deviceDate)) {
                    acc.push({
                        device,
                        event,
                        date: format(deviceDate, 'yyyy-MM-dd'),
                        serviceColor: servicesMap[device.service]?.color || '#000',
                    });
                }
            }
        });
        return acc;
    }, []);

    useEffect(() => {
        const fetchWorkers = async () => {
            try {
                const response = await getWorkers();
                const data = await response.data;
                setWorkersList(data);
            } catch (error) {
                console.error('Ошибка при получении списка работников:', error);
            }
        };
        fetchWorkers();
    }, []);

    const workersMap = useMemo(() => {
        return workersList.reduce((map, worker) => {
            map[worker.id] = worker.name;
            return map;
        }, {});
    }, [workersList]);

    const handleMonthChange = (direction) => {
        const newDate = addMonths(currentMonth, direction);
        setCurrentMonth(newDate);
    };

    const openModal = (device, event) => {
        const deviceWithEvent = {...device, event};
        setSelectedDevice(deviceWithEvent);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedDevice(null);
    };

    const renderDays = () => {
        const days = [];
        let day = startDate;

        while (day <= endDate) {
            const formattedDate = format(day, 'yyyy-MM-dd');
            const dayDevices = devicesWithDate.filter(({date}) => date === formattedDate);

            const todayClass = isToday(day)
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full p-2 shadow-lg transition duration-300'
                : 'hover:bg-gradient-to-r hover:from-indigo-100 p-2 hover:to-purple-100 transition duration-300';

            const notCurrentMonthClass = !isSameMonth(day, currentMonth)
                ? 'text-gray-400'
                : '';

            days.push(
                <div
                    key={formattedDate}
                    className={`h-[100%] border rounded-lg ${notCurrentMonthClass} ${todayClass}`}
                >
                    <div className="text-sm sm:text-base md:text-lg font-bold">
                        {format(day, 'd')}
                    </div>
                    {dayDevices.length > 0 && (
                        <div className="flex-col flex gap-1">
                            {dayDevices.map(({device, event, serviceColor}, index) => (
                                // <div
                                //     key={index}
                                //     onClick={() => openModal(device, event)}
                                //     className="text-white rounded-full p-1 sm:p-2 shadow-lg hover:opacity-80 transition duration-300 m-1"
                                //     style={{backgroundColor: serviceColor}}
                                // >
                                // </div>
                                <div  onClick={() => openModal(device, event)} className='flex gap-2 items-start p-2 border border-l-4 rounded-lg hover:opacity-50 transition duration-300 cursor-pointer' style={{borderColor: serviceColor}} key={index}>
                                    <p className='text-lg text-blue-300' >{device.restaurant_name || ''}</p>
                                    <p>
                                        {device.workers && device.workers.length > 0
                                            ? device.workers
                                                .map((workerId) => workersMap[workerId] || `ID: ${workerId}`)
                                                .join(' ')
                                            : 'Нет'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
            console.log(dayDevices)
            day = addDays(day, 1);
        }
        return days;
    };

    return (
        <div className="p-2 sm:p-4">
            <div className="flex flex-col md:flex-row md:justify-between items-center mb-4 sm:mb-6">
                <div
                    className="text-lg sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500 mb-2 md:mb-0">
                    {format(currentMonth, 'MMMM yyyy', {locale: ru})}
                </div>
                <div className="flex space-x-2 sm:space-x-3">
                    <FaArrowLeft
                        className="text-indigo-500 text-xl sm:text-2xl cursor-pointer hover:text-indigo-700 transition duration-200"
                        onClick={() => handleMonthChange(-1)}
                    />
                    <FaArrowRight
                        className="text-indigo-500 text-xl sm:text-2xl cursor-pointer hover:text-indigo-700 transition duration-200"
                        onClick={() => handleMonthChange(1)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-2 md:gap-4">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName, index) => (
                    <div
                        key={index}
                        className="text-center font-semibold text-indigo-500 text-xs sm:text-sm md:text-base"
                    >
                        {dayName}
                    </div>
                ))}
                {renderDays()}
            </div>

            {isModalOpen && selectedDevice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black bg-opacity-50">
                    <div
                        className="modal-box relative max-w-sm w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-8 sm:p-8 rounded-lg shadow-xl">
                        <button
                            className="absolute top-3 left-4 text-lg text-white"
                        >
                            {selectedDevice.event.computer_numbers}
                        </button>
                        <button
                            onClick={closeModal}
                            className="absolute top-3 right-3 text-lg text-white hover:text-gray-300 focus:outline-none"
                        >
                            ✕
                        </button>
                        <h3 className="flex items-center text-xl sm:text-2xl mt-4 font-bold mb-4 sm:mb-6">
                            <FaCalendarAlt className="mr-2"/>
                            {servicesMap[selectedDevice.service]?.name || 'Неизвестно'}
                        </h3>
                        <div className="space-y-2 sm:space-y-4">
                            <p className="text-sm sm:text-base">
                                <strong>Клиент:</strong> {selectedDevice.event.client.name}
                            </p>
                            <p className="text-sm sm:text-base">
                                <strong>Телефон:</strong> +{selectedDevice.event.client.phones.map((phone) => phone.phone_number).join(', +')}
                            </p>
                            <p className={selectedDevice.restaurant_name ? 'text-sm sm:text-base' : 'hidden'}>
                                <strong>Название ресторана:</strong> {selectedDevice.restaurant_name || 'Нет данных'}
                            </p>
                            <p className={selectedDevice.camera_count ? 'text-sm sm:text-base' : 'hidden'}>
                                <strong>Количество камер:</strong> {selectedDevice.camera_count}
                            </p>
                            <p className={selectedDevice.comment ? 'text-sm sm:text-base' : 'hidden'}>
                                <strong>Комментарий:</strong> {selectedDevice.comment}
                            </p>
                            <div className="flex items-center text-sm sm:text-base">
                                <p>
                                    <strong>Работники: </strong>
                                    {selectedDevice.workers && selectedDevice.workers.length > 0
                                        ? selectedDevice.workers
                                            .map((workerId) => workersMap[workerId] || `ID: ${workerId}`)
                                            .join(', ')
                                        : 'Нет работников'}
                                </p>
                            </div>
                            <p>
                                <strong>Общая
                                    сумма:</strong> {formatCurrency(selectedDevice.event.amount, selectedDevice.event.amount_money)}
                            </p>
                            <p>
                                <strong>Аванс:</strong> {formatCurrency(selectedDevice.event.advance, selectedDevice.event.advance_money)}
                            </p>
                            <p>
                                <strong>Остаток:</strong>{' '}
                                {formatCurrency(
                                    selectedDevice.event.amount - selectedDevice.event.advance,
                                    selectedDevice.event.amount_money
                                )}
                            </p>
                            <p className={selectedDevice.event.comment ? 'text-sm sm:text-base' : 'hidden'}>
                                <strong>Общий комментарий:</strong> {selectedDevice.event.comment}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventCalendar;
