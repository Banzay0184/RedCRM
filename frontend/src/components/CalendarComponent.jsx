import React, { useState, useEffect } from 'react';
import { Button, Typography } from '@material-tailwind/react';
import AddOrderModal from '../components/AddOrderModal';
import EditOrderModal from '../components/EditOrderModal';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { getOrders, deleteOrder } from '../api';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ru'; // Импортируем русскую локализацию для moment
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

// Настройка русских сообщений для календаря
const messages = {
    date: 'Дата',
    time: 'Время',
    event: 'Событие',
    allDay: 'Весь день',
    week: 'Неделя',
    work_week: 'Рабочая неделя',
    day: 'День',
    month: 'Месяц',
    previous: 'Назад',
    next: 'Вперёд',
    yesterday: 'Вчера',
    tomorrow: 'Завтра',
    today: 'Сегодня',
    agenda: 'Повестка дня',
    showMore: (total) => `+ ещё ${total}...`
};

const CalendarComponent = () => {
    const [orders, setOrders] = useState([]);
    const [openAddModal, setOpenAddModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await getOrders();
            setOrders(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке заказов:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Устанавливаем русскую локализацию moment
        moment.locale('ru');
        fetchOrders();
    }, []);

    const handleAddOrder = (newOrder) => {
        setOrders([...orders, { ...newOrder, id: orders.length + 1 }]);
        setOpenAddModal(false);
    };

    const handleEditOrder = (updatedOrder) => {
        setOpenEditModal(false);
        setEditingOrder(null);
        fetchOrders(); // Перезагрузка заказов с сервера
    };

    const handleDeleteOrder = async (orderId) => {
        try {
            await deleteOrder(orderId);
            setOrders(orders.filter(order => order.id !== orderId));
        } catch (error) {
            console.error("Ошибка при удалении заказа:", error);
        }
    };

    // Преобразование заказов в события для календаря
    const events = orders.flatMap(order =>
        order.events.map(event => ({
            title: `${order.client.name} - ${event.name}`,
            start: new Date(event.date),
            end: new Date(event.date),
            allDay: false,
            resource: order
        }))
    );

    // Форматы для отображения дат и времени на русском
    const formats = {
        dateFormat: 'D',
        dayFormat: (date, culture, localizer) => localizer.format(date, 'dddd', culture),
        weekdayFormat: (date, culture, localizer) => localizer.format(date, 'dddd', culture),
        monthHeaderFormat: 'MMMM YYYY',
        dayHeaderFormat: 'D MMMM YYYY',
        agendaHeaderFormat: ({ start, end }, culture, localizer) =>
            `${localizer.format(start, 'D MMMM YYYY', culture)} — ${localizer.format(end, 'D MMMM YYYY', culture)}`,
    };

    return (
        <div className="p-6">
            <div style={{ height: '70vh' }}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    messages={messages} // Русские сообщения
                    culture="ru" // Устанавливаем культуру на русский
                    formats={formats} // Устанавливаем русские форматы дат и времени
                    onSelectEvent={(event) => {
                        setSelectedOrder(event.resource);
                    }}
                />
            </div>

            <AddOrderModal
                open={openAddModal}
                setOpen={setOpenAddModal}
                handleAddOrder={handleAddOrder}
            />

            {editingOrder && (
                <EditOrderModal
                    open={openEditModal}
                    setOpen={setOpenEditModal}
                    orderId={editingOrder.id}
                    handleUpdateOrder={handleEditOrder}
                />
            )}

            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </div>
    );
};

export default CalendarComponent;
