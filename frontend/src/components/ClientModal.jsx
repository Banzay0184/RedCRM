import React, { useState } from 'react';
import { Button, Dialog, DialogHeader, DialogBody, DialogFooter, Input, Select, Option, Typography } from '@material-tailwind/react';

const ClientModal = ({ openModal, setOpenModal, handleAddClient, newClient, setNewClient }) => {
    const [selectedRegionCode, setSelectedRegionCode] = useState('+998'); // Код региона по умолчанию — Узбекистан
    const [errors, setErrors] = useState({ name: '', phone_client: [] }); // Состояние для ошибок

    const handlePhoneChange = (index, value) => {
        const phoneNumber = value.replace(/\D/g, ''); // Убираем все нецифровые символы
        const updatedPhones = [...newClient.phone_client];
        updatedPhones[index].phone_number = selectedRegionCode + phoneNumber; // Добавляем код региона
        setNewClient({ ...newClient, phone_client: updatedPhones });

        // Убираем ошибку, если пользователь исправил номер
        const updatedErrors = [...errors.phone_client];
        updatedErrors[index] = '';
        setErrors({ ...errors, phone_client: updatedErrors });
    };

    const addPhoneField = () => {
        setNewClient({ ...newClient, phone_client: [...newClient.phone_client, { phone_number: '' }] });
        setErrors({ ...errors, phone_client: [...errors.phone_client, ''] });
    };

    const removePhoneField = (index) => {
        const updatedPhones = newClient.phone_client.filter((_, i) => i !== index);
        const updatedErrors = errors.phone_client.filter((_, i) => i !== index);
        setNewClient({ ...newClient, phone_client: updatedPhones });
        setErrors({ ...errors, phone_client: updatedErrors });
    };

    const validate = () => {
        let isValid = true;
        const newErrors = { name: '', phone_client: [] };

        // Проверяем имя
        if (!newClient.name.trim()) {
            newErrors.name = 'Имя не должно быть пустым';
            isValid = false;
        }

        // Проверяем номера телефонов
        newClient.phone_client.forEach((phone, index) => {
            if (!phone.phone_number.trim()) {
                newErrors.phone_client[index] = 'Номер телефона не должен быть пустым';
                isValid = false;
            } else if (!/^\+998\d{9}$/.test(phone.phone_number)) { // Проверка на корректный номер
                newErrors.phone_client[index] = 'Введите корректный номер телефона';
                isValid = false;
            } else {
                newErrors.phone_client[index] = '';
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = () => {
        if (validate()) {
            handleAddClient(newClient); // Передаем собранные данные клиента
        }
    };

    const handleClose = () => {
        setOpenModal(false);
        setNewClient({ name: '', phone_client: [{ phone_number: '' }] });
        setErrors({ name: '', phone_client: [] }); // Очистка ошибок при закрытии модального окна
    };

    return (
        <Dialog size="lg" open={openModal} handler={handleClose}>
            <DialogHeader className="text-lg font-semibold text-gray-900">
                Добавить нового клиента
            </DialogHeader>
            <DialogBody className="space-y-6 max-h-[400px] overflow-y-auto">
                <div className="mb-6">
                    <Input
                        label="Имя клиента"
                        value={newClient.name}
                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                        className="w-full"
                        size="lg"
                        error={!!errors.name}
                    />
                    {errors.name && <Typography color="red" className="text-sm">{errors.name}</Typography>}
                </div>

                {newClient.phone_client.map((phone, index) => (
                    <div key={index} className="flex flex-col md:flex-row items-center gap-4 mb-4">
                        <div className="flex flex-col gap-2 md:flex-row items-center w-full">
                            <Select
                                label="Код региона"
                                value={selectedRegionCode}
                                onChange={(value) => setSelectedRegionCode(value)}
                                className=""
                            >
                                <Option value="+998">+998</Option>
                            </Select>
                            <Input
                                label={`Номер телефона ${index + 1}`}
                                value={phone.phone_number.replace(selectedRegionCode, '')} // Отображаем номер без кода региона
                                onChange={(e) => handlePhoneChange(index, e.target.value)}
                                className="w-full md:flex-1"
                                size="lg"
                                placeholder="Введите номер телефона"
                                error={!!errors.phone_client[index]} // Подсветка поля при ошибке
                            />
                        </div>
                        {errors.phone_client[index] && <Typography color="red" className="text-sm">{errors.phone_client[index]}</Typography>}
                        {index > 0 && (
                            <Button
                                color="red"
                                onClick={() => removePhoneField(index)}
                                size="sm"
                                className="mt-4 md:mt-0"
                            >
                                Удалить
                            </Button>
                        )}
                    </div>
                ))}

                <Button
                    onClick={addPhoneField}
                    color="green"
                    variant="text"
                    className="mt-2"
                >
                    Добавить еще номер
                </Button>
            </DialogBody>
            <DialogFooter className="flex justify-between">
                <Button variant="text" color="red" onClick={handleClose}>
                    Отмена
                </Button>
                <Button color="blue" onClick={handleSubmit}>
                    Добавить
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default ClientModal;
