import React from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button, Typography } from '@material-tailwind/react';
import { format } from 'date-fns';

const OrderDetailsModal = ({ order, onClose }) => {
    return (
        <Dialog open={!!order} handler={onClose} size="lg">
            <DialogHeader>Детали заказа</DialogHeader>
            <DialogBody>
                {/* Информация о клиенте */}
                <Typography variant="h6" className="mb-4">Информация о клиенте</Typography>
                <Typography variant="body1">Имя клиента: {order.client.name}</Typography>
                <Typography variant="body1">
                    Телефоны:
                    {order.client.phone_client.map((phone, index) => (
                        <span key={index} className="block">
                            {phone.phone_number}
                        </span>
                    ))}
                </Typography>

                {/* Информация о заказе */}
                <Typography variant="h6" className="mt-6 mb-4">Информация о заказе</Typography>
                <Typography variant="body1">Комментарий: {order.comment}</Typography>
                <Typography variant="body1">Общая сумма: ${order.total}</Typography>
                <Typography variant="body1">Оплачено: ${order.paid}</Typography>

                {/* Информация о мероприятиях */}
                <Typography variant="h6" className="mt-6 mb-4">Мероприятия</Typography>
                {order.events.map((event, index) => (
                    <div key={index} className="mb-4">
                        <Typography variant="body1" className="font-bold">
                            Мероприятие {index + 1}:
                        </Typography>
                        <Typography variant="body1">Ресторан: {event.restaurant_name}</Typography>
                        <Typography variant="body1">
                            Дата и время: {format(new Date(event.date), 'dd.MM.yyyy HH:mm')}
                        </Typography>
                        <Typography variant="body1">Название: {event.name}</Typography>

                        {/* Услуги */}
                        <Typography variant="body1" className="mt-2">Услуги:</Typography>
                        {event.services.map((service, idx) => (
                            <Typography key={idx} variant="body2">
                                {service.name}: ${service.price}
                            </Typography>
                        ))}

                        {/* Работники */}
                        <Typography variant="body1" className="mt-2">Работники:</Typography>
                        {event.workers.map((worker, idx) => (
                            <Typography key={idx} variant="body2">
                                {worker.name} (Телефон: {worker.phone_number})
                            </Typography>
                        ))}
                    </div>
                ))}
            </DialogBody>
            <DialogFooter>
                <Button variant="text" color="red" onClick={onClose}>
                    Закрыть
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default OrderDetailsModal;
