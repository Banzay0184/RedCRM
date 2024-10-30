import { useState } from 'react';
import { IMaskInput } from 'react-imask';
import { updateClient } from '../api';

function EditClientModal({ client, onClose, onSave }) {
    const [name, setName] = useState(client.name);
    const [phones, setPhones] = useState(client.phones.map((phone) => phone.phone_number));
    const [is_vip, setIsVIP] = useState(client.is_vip);
    const [errorMessage, setErrorMessage] = useState('');
    const [phoneErrors, setPhoneErrors] = useState({});

    const handleAddPhone = () => {
        setPhones([...phones, '']);
    };

    const handleRemovePhone = (index) => {
        setPhones(phones.filter((_, idx) => idx !== index));
    };

    const handlePhoneChange = (index, value) => {
        const newPhones = [...phones];
        newPhones[index] = value;
        setPhones(newPhones);

        // Очистка ошибок при изменении
        setPhoneErrors((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors[index];
            return newErrors;
        });
    };

    // Функция нормализации номера телефона
    const normalizePhoneNumber = (phone) => {
        const digits = phone.replace(/\D/g, ''); // Удаляем все нецифровые символы
        return '+' + digits;
    };

    const validatePhone = (phone) => {
        const normalizedPhone = normalizePhoneNumber(phone);
        const phoneRegex = /^\+998\d{9}$/; // Ожидаемый формат: +998XXXXXXXXX
        return phoneRegex.test(normalizedPhone);
    };

    const handleSave = async () => {
        // Валидация номеров телефонов
        let isValid = true;
        const newPhoneErrors = {};

        phones.forEach((phone, index) => {
            if (!validatePhone(phone)) {
                isValid = false;
                newPhoneErrors[index] = 'Номер телефона должен быть в формате «+998901234567».';
            }
        });

        if (!isValid) {
            setPhoneErrors(newPhoneErrors);
            setErrorMessage('Пожалуйста, исправьте ошибки в номерах телефонов.');
            return;
        }

        const updatedClient = {
            name,
            is_vip,
            phones: phones
                .filter((phone) => phone.trim() !== '')
                .map((phone, idx) => ({
                    id: client.phones[idx]?.id,
                    phone_number: normalizePhoneNumber(phone), // Используем нормализованный номер
                })),
        };

        try {
            const response = await updateClient(client.id, updatedClient);
            onSave(response.data);
        } catch (error) {
            console.error('Ошибка при обновлении клиента:', error);
            setErrorMessage('Не удалось обновить данные клиента. Пожалуйста, попробуйте снова.');
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Изменить клиента</h3>
                <div className="py-4">
                    {errorMessage && (
                        <div className="alert alert-error mb-4">
                            <div>
                                <span>{errorMessage}</span>
                            </div>
                        </div>
                    )}
                    <input
                        type="text"
                        placeholder="Имя клиента"
                        className="input input-bordered w-full mb-2"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <div className="mb-2">
                        {phones.map((phone, index) => (
                            <div key={index} className="mb-2">
                                <IMaskInput
                                    mask="+998(00) 000-00-00"
                                    lazy={false}
                                    value={phone}
                                    onAccept={(value) => handlePhoneChange(index, value)}
                                    placeholder="+998(__) ___-__-__"
                                    className={`input input-bordered w-full ${
                                        phoneErrors[index] ? 'input-error' : ''
                                    }`}
                                />
                                {phoneErrors[index] && (
                                    <p className="text-red-500 text-sm mt-1">{phoneErrors[index]}</p>
                                )}
                                {phones.length > 1 && (
                                    <button
                                        className="btn btn-error btn-xs mt-1"
                                        onClick={() => handleRemovePhone(index)}
                                    >
                                        Удалить
                                    </button>
                                )}
                            </div>
                        ))}
                        <button className="btn btn-sm btn-secondary" onClick={handleAddPhone}>
                            Добавить телефон
                        </button>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            className="checkbox mr-2"
                            checked={is_vip}
                            onChange={() => setIsVIP(!is_vip)}
                        />
                        <span>VIP клиент</span>
                    </div>
                </div>
                <div className="modal-action">
                    <button className="btn" onClick={onClose}>
                        Отмена
                    </button>
                    <button className="btn btn-primary text-white" onClick={handleSave}>
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EditClientModal;
