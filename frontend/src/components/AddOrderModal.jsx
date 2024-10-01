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
    IconButton
} from '@material-tailwind/react';
import {getClients, getServices, getWorkers, createOrder, createClient} from '../api';
import ClientModal from './ClientModal';
import {TrashIcon, XMarkIcon} from '@heroicons/react/24/outline';

const AddOrderModal = ({open, setOpen, handleAddOrder}) => {
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [services, setServices] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [newOrder, setNewOrder] = useState({comment: '', total: 0, paid: '', client: '', events: []});
    const [openClientModal, setOpenClientModal] = useState(false);
    const [newClient, setNewClient] = useState({name: '', phone_client: [{phone_number: ''}]});
    const [events, setEvents] = useState([
        {
            restaurant_name: '',
            name: '',
            date: '',
            services: [],
            workers: []
        }
    ]);
    const [totalCalculated, setTotalCalculated] = useState(0); // Автоматически рассчитанная сумма
    const [isManualTotal, setIsManualTotal] = useState(false); // Флаг для определения, изменял ли пользователь сумму вручную
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchClients();
            fetchServices();
            fetchWorkers();
        }
    }, [open]);

    const fetchClients = async () => {
        try {
            const response = await getClients();
            setClients(response.data);
            setFilteredClients(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке клиентов:", error);
        }
    };

    const fetchServices = async () => {
        try {
            const response = await getServices();
            setServices(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке услуг:", error);
        }
    };

    const fetchWorkers = async () => {
        try {
            const response = await getWorkers();
            setWorkers(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке работников:", error);
        }
    };

    const handleSearchClient = (query) => {
        setSearchQuery(query);
        const filtered = clients.filter((client) =>
            client.name.toLowerCase().includes(query.toLowerCase()) ||
            client.phone_client.some(phone => phone.phone_number.includes(query))
        );
        setFilteredClients(filtered);
    };

    const handleSelectClient = (clientId) => {
        setNewOrder({...newOrder, client: clientId});
    };

    const handleClearClient = () => {
        setNewOrder({...newOrder, client: ''});
        setSearchQuery('');
    };

    const handleAddClient = async (clientData) => {
        try {
            const response = await createClient(clientData);
            const addedClient = response.data;

            if (addedClient && addedClient.id) {
                setClients([...clients, addedClient]);
                setNewOrder({...newOrder, client: addedClient.id});
                setOpenClientModal(false);
                setNewClient({name: '', phone_client: [{phone_number: ''}]});
            }
        } catch (error) {
            console.error("Ошибка при добавлении клиента:", error);
        }
    };

    const handleAddEvent = () => {
        setEvents([...events, {
            restaurant_name: '',
            name: '',
            date: '',
            services: [],
            workers: []
        }]);
    };

    const handleEventChange = (index, field, value) => {
        const updatedEvents = events.map((event, i) =>
            i === index ? {...event, [field]: value} : event
        );
        setEvents(updatedEvents);
    };

    // Обработчик изменения услуги
    const handleServiceChange = (eventIndex, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        const updatedEvents = events.map((event, i) => {
            if (i === eventIndex) {
                const updatedServices = event.services.includes(service)
                    ? event.services.filter(s => s.id !== serviceId)
                    : [...event.services, service];
                return {...event, services: updatedServices};
            }
            return event;
        });
        setEvents(updatedEvents);
        calculateTotal(updatedEvents);
    };

    const handleWorkerChange = (eventIndex, workerId) => {
        const worker = workers.find(w => w.id === workerId);
        const updatedEvents = events.map((event, i) => {
            if (i === eventIndex) {
                const updatedWorkers = event.workers.includes(worker)
                    ? event.workers.filter(w => w.id !== workerId)
                    : [...event.workers, worker];
                return {...event, workers: updatedWorkers};
            }
            return event;
        });
        setEvents(updatedEvents);
    };

    // Автоматический расчёт общей суммы на основе выбранных услуг
    const calculateTotal = (updatedEvents) => {
        const total = updatedEvents.reduce((acc, event) => {
            const servicesTotal = event.services.reduce((sum, service) => sum + parseFloat(service.price), 0);
            return acc + servicesTotal;
        }, 0);
        setTotalCalculated(total);

        if (!isManualTotal) {
            setNewOrder({...newOrder, total});
        }
    };

    // Обработка ручного изменения общей суммы
    const handleTotalChange = (e) => {
        setIsManualTotal(true); // Устанавливаем флаг, что пользователь изменил сумму вручную
        setNewOrder({...newOrder, total: parseFloat(e.target.value)});
    };

    const handleRemoveEvent = (index) => {
        const updatedEvents = events.filter((_, i) => i !== index);
        setEvents(updatedEvents);
        calculateTotal(updatedEvents); // Пересчёт суммы при удалении события
    };

    const handleSubmit = async () => {
        if (!newOrder.total || !newOrder.paid || !newOrder.client || events.length === 0) {
            console.error("Не все поля заполнены.");
            return;
        }

        setLoading(true);

        const selectedClient = clients.find(client => client.id === newOrder.client);

        const orderData = {
            comment: newOrder.comment,
            total: parseFloat(newOrder.total),
            paid: parseFloat(newOrder.paid),
            client: {
                name: selectedClient.name,
                phone_client: selectedClient.phone_client.map(phone => ({phone_number: phone.phone_number}))
            },
            events: events.map(event => ({
                restaurant_name: event.restaurant_name,
                name: event.name,
                date: event.date,
                services: event.services.map(service => ({id: service.id, name: service.name, price: service.price})),
                workers: event.workers.map(worker => ({
                    id: worker.id,
                    name: worker.name,
                    phone_number: worker.phone_number
                }))
            }))
        };

        try {
            const response = await createOrder(orderData);
            handleAddOrder(response.data);
            setOpen(false);
        } catch (error) {
            console.error("Ошибка при добавлении заказа:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} handler={() => setOpen(false)} size="sm">
            <DialogHeader>Добавить новый заказ</DialogHeader>
            <DialogBody className="space-y-4 max-h-[500px] overflow-y-auto">
                {/* Клиент */}
                <Typography variant="h6">Клиент</Typography>
                {newOrder.client ? (
                    <div className='flex items-center justify-between gap-2'>
                        <div className="flex flex-row items-center gap-2">
                            <Input label={clients.find(client => client.id === newOrder.client)?.name} disabled/>
                            {clients.find(client => client.id === newOrder.client)?.phone_client.map((phone, index) => (
                                <Input key={index} label={phone.phone_number} disabled/>
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
                            {filteredClients.length > 0 ? (
                                filteredClients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => handleSelectClient(client.id)}
                                        className="cursor-pointer p-2 hover:bg-gray-100 border-b"
                                    >
                                        <Typography>{client.name}</Typography>
                                        <Typography className="text-sm text-gray-600">
                                            {client.phone_client.map(phone => phone.phone_number).join(', ')}
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
                {events.map((event, index) => (
                    <div key={index} className="mt-4 border rounded p-4 border-gray-300 bg-gray-50 space-y-4">
                        <div className=' flex items-center justify-between gap-2'>
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
                            value={event.restaurant_name}
                            onChange={(e) => handleEventChange(index, 'restaurant_name', e.target.value)}
                        />
                        <Input
                            label="Название мероприятия"
                            value={event.name}
                            onChange={(e) => handleEventChange(index, 'name', e.target.value)}
                        />
                        <Input
                            type="datetime-local"
                            label="Дата и время"
                            value={event.date}
                            onChange={(e) => handleEventChange(index, 'date', e.target.value)}
                        />

                        {/* Услуги */}
                        <Typography variant="h6" className="mt-4">Услуги</Typography>
                        <div className="border rounded border-gray-300 bg-white max-h-28 overflow-y-auto">
                            {services.map(service => (
                                <div key={`${service.id}-${index}`} className="flex items-center">
                                    <Checkbox
                                        checked={event.services.includes(service)}
                                        onChange={() => handleServiceChange(index, service.id)}
                                    />
                                    <Typography>{service.name} - {service.price} ₽</Typography>
                                </div>
                            ))}
                        </div>

                        {/* Работники */}
                        <Typography variant="h6" className="mt-4">Работники</Typography>
                        <div className="max-h-28 overflow-y-auto border rounded border-gray-300 bg-white">
                            {workers.map(worker => (
                                <div key={`${worker.id}-${index}`} className="flex items-center">
                                    <Checkbox
                                        checked={event.workers.includes(worker)}
                                        onChange={() => handleWorkerChange(index, worker.id)}
                                    />
                                    <Typography>{worker.name} - {worker.phone_number}</Typography>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <Button color="blue" onClick={handleAddEvent} className="mt-4">
                    Ещё добавить событие
                </Button>

                {/* Комментарий и суммы */}
                <Typography variant="h6">Комментарий</Typography>
                <Input
                    label="Комментарий"
                    value={newOrder.comment}
                    onChange={(e) => setNewOrder({...newOrder, comment: e.target.value})}
                />
                <Input
                    label="Общая сумма"
                    type="number"
                    value={newOrder.total}
                    onChange={handleTotalChange}
                />
                <Input
                    label="Оплачено"
                    type="number"
                    value={newOrder.paid}
                    onChange={(e) => setNewOrder({...newOrder, paid: e.target.value})}
                />
            </DialogBody>

            <DialogFooter>
                <Button variant="text" color="red" onClick={() => setOpen(false)}>
                    Отмена
                </Button>
                <Button color="green" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Добавление...' : 'Добавить заказ'}
                </Button>
            </DialogFooter>

            <ClientModal
                openModal={openClientModal}
                setOpenModal={setOpenClientModal}
                handleAddClient={handleAddClient}
                newClient={newClient}
                setNewClient={setNewClient}
            />
        </Dialog>
    );
};

export default AddOrderModal;
