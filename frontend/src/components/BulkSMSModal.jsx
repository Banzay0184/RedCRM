import { useState } from 'react';

function BulkSMSModal({ clients, onSendSMS, onClose }) {
    const [message, setMessage] = useState('');

    const handleSendSMS = () => {
        onSendSMS(message);
        onClose();
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Отправка массового SMS</h3>
                <p>Отправка SMS для следующих клиентов:</p>
                <ul className="list-disc list-inside">
                    {clients.map((client) => (
                        <li key={client.id}>{client.name}</li>
                    ))}
                </ul>
                <textarea
                    className="textarea textarea-bordered w-full mt-4"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Сообщение для отправки"
                ></textarea>
                <div className="modal-action">
                    <button className="btn btn-success" onClick={handleSendSMS}>
                        Отправить SMS
                    </button>
                    <button className="btn btn-ghost" onClick={onClose}>
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BulkSMSModal;
