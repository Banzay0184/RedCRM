import React, {useState, useEffect} from 'react';
import {Button, Card, Typography, IconButton} from '@material-tailwind/react';
import {PencilIcon, TrashIcon, EyeIcon, CalendarIcon, ListBulletIcon} from '@heroicons/react/24/outline';
import AddOrderModal from '../components/AddOrderModal';
import EditOrderModal from '../components/EditOrderModal';
import OrderDetailsModal from '../components/OrderDetailsModal';
import {getOrders, deleteOrder} from '../api';
import {format, isToday, isTomorrow, compareAsc, isPast} from 'date-fns';
import CalendarComponent from '../components/CalendarComponent';
import Layout from "../components/Layout.jsx";

const Order = () => {
    const [orders, setOrders] = useState([]);
    const [openAddModal, setOpenAddModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewType, setViewType] = useState('list');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await getOrders();
            setOrders(response.data);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleAddOrder = (newOrder) => {
        setOrders([...orders, {...newOrder, id: orders.length + 1}]);
        setOpenAddModal(false);
    };

    const handleEditOrder = (updatedOrder) => {
        setOpenEditModal(false);
        setEditingOrder(null);
        fetchOrders();
    };

    const handleDeleteOrder = async (orderId) => {
        try {
            await deleteOrder(orderId);
            setOrders(orders.filter(order => order.id !== orderId));
        } catch (error) {
            console.error("Error deleting order:", error);
        }
    };

    const getEventBackgroundColor = (eventDate) => {
        const eventDateParsed = new Date(eventDate);
        if (isToday(eventDateParsed)) {
            return 'bg-green-100';
        }
        if (isTomorrow(eventDateParsed)) {
            return 'bg-yellow-100';
        }
        return 'bg-white';
    };

    const filterUpcomingEvents = (events) => {
        return events.filter(event => !isPast(new Date(event.date)));
    };

    const sortedOrders = orders
        .map(order => {
            const upcomingEvents = filterUpcomingEvents(order.events);
            if (upcomingEvents.length === 0) {
                return null;
            }

            const earliestEventDate = new Date(
                Math.min(...upcomingEvents.map(event => new Date(event.date).getTime()))
            );

            return {...order, earliestEventDate, events: upcomingEvents};
        })
        .filter(order => order !== null)
        .sort((a, b) => compareAsc(a.earliestEventDate, b.earliestEventDate));

    return (
        <Layout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                        <Typography variant="h5">Заказы ({sortedOrders.length})</Typography>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            color={viewType === 'list' ? 'blue' : 'gray'}
                            onClick={() => setViewType('list')}
                        >
                            <ListBulletIcon className="h-5 w-5"/>
                        </Button>
                        <Button
                            color={viewType === 'calendar' ? 'blue' : 'gray'}
                            onClick={() => setViewType('calendar')}
                        >
                            <CalendarIcon className="h-5 w-5"/>
                        </Button>
                        <Button color="green" onClick={() => setOpenAddModal(true)}>
                            Добавить заказ
                        </Button>
                    </div>
                </div>

                {viewType === 'list' ? (
                    <div className="space-y-4">
                        {loading ? (
                            <Typography>Loading...</Typography>
                        ) : sortedOrders.length > 0 ? (
                            sortedOrders.map((order, orderIndex) => (
                                <Card key={order.id || `order-${orderIndex}`} className="p-4 relative">
                                    <div className="absolute top-2 right-2 flex space-x-2">
                                        <IconButton
                                            variant="text"
                                            color="blue"
                                            onClick={() => {
                                                setEditingOrder(order);
                                                setOpenEditModal(true);
                                            }}
                                        >
                                            <PencilIcon className="h-5 w-5"/>
                                        </IconButton>
                                        <IconButton
                                            variant="text"
                                            color="green"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <EyeIcon className="h-5 w-5"/>
                                        </IconButton>
                                        <IconButton
                                            variant="text"
                                            color="red"
                                            onClick={() => handleDeleteOrder(order.id)}
                                        >
                                            <TrashIcon className="h-5 w-5"/>
                                        </IconButton>
                                    </div>

                                    <Typography variant="h6">Имя клиента: {order.client.name}</Typography>
                                    <Typography variant="small">
                                        {order.client.phone_client.map((item, index) => (
                                            <span key={item.id || `${item.phone_number}-${index}`}>
                                            Номер телефона:
                                            <a href={`tel:${item.phone_number}`} className='text-blue-500'>
                                                {item.phone_number}
                                            </a><br/>
                                        </span>
                                        ))}
                                    </Typography>
                                    <Typography variant="small">
                                        {order.events.map((event, index) => (
                                            <div
                                                key={event.id || `${event.date}-${index}`}
                                                className={`p-2 rounded ${getEventBackgroundColor(event.date)}`}
                                            >
                                                <p>Мероприятие: <span
                                                    className='text-green-600 font-bold'>{event.name}</span> - {format(new Date(event.date), 'dd.MM.yyyy HH:mm')}
                                                </p>
                                            </div>
                                        ))}
                                    </Typography>
                                </Card>
                            ))
                        ) : (
                            <Typography>Нет предстоящих заказов.</Typography>
                        )}
                    </div>
                ) : (
                    <CalendarComponent orders={orders}/>
                )}

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
        </Layout>
    );
};

export default Order;
