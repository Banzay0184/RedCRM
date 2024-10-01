import React, {useState} from 'react';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button, Textarea, Typography} from '@material-tailwind/react';
import {sendSMS} from '../api.jsx';
import {toast} from 'react-toastify';

const SendMessageModal = ({open, setOpen, client, isMassSMS, selectedClients, setSelectedClients}) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSendMessage = () => {
        if (message.trim() === '') {
            toast.error('Введите сообщение');
            return;
        }

        const data = {
            message: message,
            clients: isMassSMS ? selectedClients.map(client => client.id) : [client.id] // Отправляем ID клиентов
        };

        setIsSending(true);
        sendSMS(data)
            .then(() => {
                toast.success("Сообщение успешно отправлено!");
                setOpen(false);
                setMessage('');
                setSelectedClients([]); // Сбрасываем выбранных клиентов после отправки
            })
            .catch((error) => {
                toast.error("Ошибка при отправке сообщения");
                console.error('Ошибка при отправке сообщения:', error);
            })
            .finally(() => {
                setIsSending(false);
            });
    };


    return (
        <Dialog open={open} handler={() => setOpen(false)}>
            <DialogHeader>Отправить сообщение клиенту</DialogHeader>
            <DialogBody>
                <Typography variant="h6">
                    {isMassSMS ? `Выбрано клиентов: ${selectedClients.length}` : `Клиент: ${client?.name || 'Неизвестный'}`}
                </Typography>
                <Textarea
                    label="Сообщение"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    disabled={isSending}
                />
            </DialogBody>
            <DialogFooter>
                <Button variant="text" onClick={() => setOpen(false)} disabled={isSending}>
                    Отмена
                </Button>
                <Button color="blue" onClick={handleSendMessage} disabled={isSending}>
                    {isSending ? 'Отправка...' : 'Отправить'}
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default SendMessageModal;
