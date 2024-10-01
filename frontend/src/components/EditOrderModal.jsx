import React, {useState, useEffect} from 'react';
import {
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Button,
    Input,
    Typography,
    Checkbox,
    IconButton,
} from '@material-tailwind/react';
import {getClients, getServices, getWorkers, updateOrder, getOrderById} from '../api';
import ClientModal from './ClientModal';
import {TrashIcon, XMarkIcon} from '@heroicons/react/24/outline';
import {formatISO} from 'date-fns';


const EditOrderModal = ({open, setOpen, orderId, handleUpdateOrder}) => {
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [services, setServices] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [order, setOrder] = useState(null);
    const [openClientModal, setOpenClientModal] = useState(false);
    const [newClient, setNewClient] = useState({name: '', phone_client: [{phone_number: ''}]});
    const [events, setEvents] = useState([]);
    const [totalCalculated, setTotalCalculated] = useState(0);
    const [isManualTotal, setIsManualTotal] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && orderId) {
            console.log('Открытие модального окна, загрузка данных...');

            const loadOrderDetails = async () => {
                try {
                    await fetchWorkers(); // Загружаем работников перед обработкой заказа
                    const clientsData = await fetchClients();
                    await fetchOrderDetails(orderId, clientsData);
                    fetchServices();
                } catch (error) {
                    console.error('Ошибка при загрузке данных:', error);
                }
            };

            loadOrderDetails();
        }
    }, [open, orderId]);


    const fetchOrderDetails = async (id, clientsData) => {
        try {
            const response = await getOrderById(id);
            const orderData = response.data;

            // Найти клиента по ID
            const clientData = clientsData.find((client) => client.id === orderData.client.id);
            if (clientData) {
                setOrder({...orderData, client: clientData});
            } else {
                console.error('Клиент не найден.');
                setOrder({...orderData, client: null});
            }

            // Сопоставляем работников в событиях с общим списком работников
            const updatedEvents = orderData.events.map((event) => {
                return {
                    ...event,
                    workers: event.workers.map((worker) => {
                        // Ищем работника в общем списке работников по ID
                        const matchingWorker = workers.find((w) => w.id === worker.id);
                        return matchingWorker ? matchingWorker : worker;
                    }),
                };
            });

            setEvents(updatedEvents);
        } catch (error) {
            console.error('Ошибка при загрузке данных заказа:', error);
        }
    };


    const fetchClients = async () => {
        try {
            const response = await getClients();
            setClients(response.data);
            setFilteredClients(response.data);
            return response.data; // Возвращаем список клиентов
        } catch (error) {
            console.error('Ошибка при загрузке клиентов:', error);
            return []; // Возвращаем пустой массив в случае ошибки
        }
    };


    const fetchServices = async () => {
        try {
            const response = await getServices();
            setServices(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке услуг:', error);
        }
    };

    const fetchWorkers = async () => {
        try {
            const response = await getWorkers();
            const workersWithIds = response.data.map((worker, index) => ({
                ...worker,
                id: worker.id || `temp-${index}`, // Используем либо реальный ID, либо временный
            }));
            setWorkers(workersWithIds);
        } catch (error) {
            console.error('Ошибка при загрузке работников:', error);
        }
    };


    const handleSearchClient = (query) => {
        setSearchQuery(query);
        const filtered = clients.filter((client) =>
            client.name.toLowerCase().includes(query.toLowerCase()) ||
            client.phone_client.some((phone) => phone.phone_number.includes(query))
        );
        setFilteredClients(filtered);
    };

    const handleSelectClient = (clientId) => {
        const selectedClient = clients.find(client => client.id === clientId);
        setOrder({...order, client: selectedClient});
    };

    const handleClearClient = () => {
        setOrder({...order, client: ''});
        setSearchQuery('');
    };

    const handleAddEvent = () => {
        setEvents([
            ...events,
            {
                restaurant_name: '',
                name: '',
                date: '',
                services: [],
                workers: [],
            },
        ]);
    };

    const handleEventChange = (index, field, value) => {
        const updatedEvents = events.map((event, i) => (i === index ? {...event, [field]: value} : event));
        setEvents(updatedEvents);
    };


    const handleServiceChange = (eventIndex, serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        const updatedEvents = events.map((event, i) => {
            if (i === eventIndex) {
                const updatedServices = event.services.includes(service)
                    ? event.services.filter((s) => s.id !== serviceId)
                    : [...event.services, service];
                return {...event, services: updatedServices};
            }
            return event;
        });
        setEvents(updatedEvents);
        calculateTotal(updatedEvents);
    };

    const handleWorkerChange = (eventIndex, workerId) => {
        if (!workerId) {
            console.error(`Invalid worker ID:`, workerId);
            return;
        }

        setEvents((prevEvents) => {
            // Создаем глубокую копию текущего списка событий
            const updatedEvents = [...prevEvents];

            // Находим нужное событие для обновления
            const eventToUpdate = updatedEvents[eventIndex];

            // Проверяем, выбран ли работник в текущем событии
            const isWorkerSelected = eventToUpdate.workers.some((w) => w.id === workerId);

            // Находим работника из общего списка работников
            const worker = workers.find((w) => w.id === workerId);
            if (!worker) {
                console.error(`Worker with ID ${workerId} not found.`);
                return prevEvents; // Возвращаем текущее состояние, если работник не найден
            }

            // Обновляем список работников
            const updatedWorkers = isWorkerSelected
                ? eventToUpdate.workers.filter((w) => w.id !== workerId) // Удаляем работника, если он уже выбран
                : [...eventToUpdate.workers, worker]; // Добавляем работника, если он не выбран

            // Обновляем событие с измененным списком работников
            updatedEvents[eventIndex] = {...eventToUpdate, workers: updatedWorkers};

            // Логируем изменения для отладки
            console.log(`Worker ID: ${workerId}, Event Index: ${eventIndex}`);
            console.log(`Updated workers for event ${eventIndex}:`, updatedWorkers);

            return updatedEvents;
        });
    };

    const calculateTotal = (updatedEvents) => {
        const total = updatedEvents.reduce((acc, event) => {
            const servicesTotal = event.services.reduce((sum, service) => sum + parseFloat(service.price), 0);
            return acc + servicesTotal;
        }, 0);
        setTotalCalculated(total);

        if (!isManualTotal) {
            setOrder({...order, total});
        }
    };

    const handleTotalChange = (e) => {
        setIsManualTotal(true);
        setOrder({...order, total: parseFloat(e.target.value)});
    };

    const handleRemoveEvent = (index) => {
        const updatedEvents = events.filter((_, i) => i !== index);
        setEvents(updatedEvents);
        calculateTotal(updatedEvents);
    };

    const handleSubmit = async () => {
        if (!order?.total || !order?.paid || !order?.client || events.length === 0) {
            console.error('Не все поля заполнены.');
            return;
        }

        setLoading(true);

        // Проверяем, что клиент действительно существует в объекте заказа
        if (!order.client) {
            console.error('Выбранный клиент не найден.');
            setLoading(false);
            return;
        }

        const updatedOrderData = {
            comment: order.comment,
            total: parseFloat(order.total),
            paid: parseFloat(order.paid),
            client: {
                name: order.client.name,
                phone_client: order.client.phone_client.map((phone) => ({phone_number: phone.phone_number})),
            },
            events: events.map((event) => ({
                restaurant_name: event.restaurant_name,
                name: event.name,
                date: event.date,
                services: event.services.map((service) => ({id: service.id, name: service.name, price: service.price})),
                workers: event.workers.map((worker) => ({
                    id: worker.id,
                    name: worker.name,
                    phone_number: worker.phone_number,
                })),
            })),
        };

        try {
            await updateOrder(orderId, updatedOrderData);
            handleUpdateOrder(orderId, updatedOrderData);
            setOpen(false);
        } catch (error) {
            console.error('Ошибка при обновлении заказа:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} handler={() => setOpen(false)} size="sm">
            <DialogHeader>Редактировать Заказ</DialogHeader>
            <DialogBody className="space-y-4 max-h-[500px] overflow-y-auto">
                {/* Клиент */}
                <Typography variant="h6">Клиент</Typography>
                {order && order.client ? (
                    <div className='flex items-start gap-2'>
                        <div
                            className={order.client.phone_client?.length > 1 ? 'flex flex-col items-center gap-2' : 'flex flex-row items-center gap-2'}>
                            <Input
                                label={order.client.name || 'Неизвестный клиент'}
                                disabled
                            />
                            {/* Проверка существования phone_client */}
                            {order.client.phone_client?.map((phone, index) => (
                                <Input key={`${phone.phone_number}-${index}`} label={phone.phone_number} disabled/>
                            ))}
                        </div>
                        <IconButton
                            variant="text"
                            color="red"
                            onClick={handleClearClient}
                        >
                            <XMarkIcon className="h-5 w-5"/>
                        </IconButton>
                    </div>
                ) : (
                    <div>
                        <Input
                            color="blue"
                            label="Поиск клиента"
                            value={searchQuery}
                            onChange={(e) => handleSearchClient(e.target.value)}
                            placeholder="Введите имя клиента или номер телефона"
                        />
                        <div
                            className="max-h-20 overflow-y-auto border rounded border-gray-300 bg-gray-50 space-y-2 p-2">
                            {filteredClients?.length > 0 ? (
                                filteredClients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => handleSelectClient(client.id)}
                                        className="cursor-pointer p-2 hover:bg-gray-100 border-b"
                                    >
                                        <Typography>{client.name}</Typography>
                                        <Typography className="text-sm text-gray-600">
                                            {client.phone_client?.map(phone => phone.phone_number).join(', ')}
                                        </Typography>
                                    </div>
                                ))
                            ) : (
                                <Typography>Клиенты не найдены.</Typography>
                            )}
                        </div>
                        <Button color="blue" onClick={() => setOpenClientModal(true)} className="mt-4">
                            Добавить нового клиента
                        </Button>
                    </div>
                )}

                {/* События */}
                {events?.map((event, index) => (
                    <div key={`event-${index}`}
                         className="mt-4 border rounded p-4 border-gray-300 bg-gray-50 space-y-4">
                        <div className='flex items-center justify-between gap-2'>
                            <Typography variant="h6">Событие {index + 1}</Typography>
                            <IconButton
                                variant="text"
                                color="red"
                                onClick={() => handleRemoveEvent(index)}
                            >
                                <TrashIcon className="h-5 w-5"/>
                            </IconButton>
                        </div>
                        <Input
                            label="Название ресторана"
                            value={event.restaurant_name || ''}
                            onChange={(e) => handleEventChange(index, 'restaurant_name', e.target.value)}
                        />
                        <Input
                            label="Название мероприятия"
                            value={event.name || ''}
                            onChange={(e) => handleEventChange(index, 'name', e.target.value)}
                        />
                        <Input
                            type="datetime-local"
                            label="Дата и время"
                            value={event.date ? formatISO(new Date(event.date), {representation: 'complete'}).slice(0, 16) : ''}
                            onChange={(e) => handleEventChange(index, 'date', e.target.value)}
                        />

                        {/* Услуги */}
                        <Typography variant="h6" className="mt-4">Услуги</Typography>
                        <div className="border rounded border-gray-300 bg-white max-h-28 overflow-y-auto">
                            {services?.map(service => (
                                <div key={`service-${service.id}-${index}`} className="flex items-center">
                                    <Checkbox
                                        checked={event.services?.some((s) => s.id === service.id)}
                                        onChange={() => handleServiceChange(index, service.id)}
                                    />
                                    <Typography>{service.name} - {service.price} ₽</Typography>
                                </div>
                            ))}
                        </div>

                        {/* Работники */}
                        <Typography variant="h6" className="mt-4">Работники</Typography>
                        <div className="max-h-28 overflow-y-auto border rounded border-gray-300 bg-white">
                            {workers?.map((worker, workerIndex) => (
                                <div key={`worker-${worker.id || workerIndex}-${index}`} className="flex items-center">
                                    <Checkbox
                                        checked={event.workers.some((w) => w.id === worker.id)}
                                        onChange={() => handleWorkerChange(index, worker.id)}
                                    />
                                    <Typography>{worker.name} - {worker.phone_number}</Typography>
                                </div>
                            ))}
                        </div>

                    </div>
                ))}

                <Button color="blue" onClick={handleAddEvent} className="mt-4">
                    Добавить ещё событие
                </Button>

                {/* Комментарий и суммы */}
                <Typography variant="h6">Комментарий</Typography>
                <Input
                    label="Комментарий"
                    value={order?.comment || ''}
                    onChange={(e) => setOrder({...order, comment: e.target.value})}
                />
                <Input
                    label="Общая сумма"
                    type="number"
                    value={order?.total || ''}
                    onChange={handleTotalChange}
                />
                <Input
                    label="Оплачено"
                    type="number"
                    value={order?.paid || ''}
                    onChange={(e) => setOrder({...order, paid: e.target.value})}
                />
            </DialogBody>

            <DialogFooter>
                <Button variant="text" color="red" onClick={() => setOpen(false)}>
                    Отмена
                </Button>
                <Button color="green" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Обновление...' : 'Обновить заказ'}
                </Button>
            </DialogFooter>

            <ClientModal
                openModal={openClientModal}
                setOpenModal={setOpenClientModal}
                handleAddClient={(clientData) => handleAddClient(clientData)}
                newClient={newClient}
                setNewClient={setNewClient}
            />
        </Dialog>
    );
};

export default EditOrderModal;
