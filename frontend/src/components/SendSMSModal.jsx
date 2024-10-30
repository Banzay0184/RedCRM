import {useState} from 'react';

function SendSMSModal({client, onClose}) {
    const [message, setMessage] = useState('');

    const handleSend = async () => {
        try {
            await sendSMS(client.id, message);
            alert(`SMS отправлено клиенту ${client.name}`);
        } catch (error) {
            console.error('Ошибка при отправке SMS:', error);
        } finally {
            onClose();
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Отправить SMS клиенту {client.name}</h3>
                <div className="py-4">
                    <textarea
                        className="textarea textarea-bordered w-full"
                        placeholder="Введите сообщение"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                </div>
                <div className="modal-action">
                    <button className="btn" onClick={onClose}>
                        Отмена
                    </button>
                    <button className="btn btn-primary text-white" onClick={handleSend}>
                        Отправить
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SendSMSModal;
