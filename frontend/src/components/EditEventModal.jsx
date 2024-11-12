import React, {useEffect, useRef, useState} from 'react';
import {IMaskInput} from 'react-imask';
import {getClients, getServices, getWorkers, updateEvent} from '../api';
import {toast, Toaster} from 'react-hot-toast';
import axios from "axios";

const EditEventModal = ({event, onClose, onUpdate}) => {
    const [clientName, setClientName] = useState('');
    const [clients, setClients] = useState([]);
    const [isVIP, setIsVIP] = useState(false);
    const [phoneNumbers, setPhoneNumbers] = useState([{phone_number: ''}]);
    const [workers, setWorkers] = useState([]);
    const [selectedWorkers, setSelectedWorkers] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    // const [restaurantName, setRestaurantName] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [advancePayment, setAdvancePayment] = useState('');
    const [generalComment, setGeneralComment] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const isSaving = useRef(false);
    const [loading, setLoading] = useState(true);

    // Состояния для валют и конвертации
    const [currency, setCurrency] = useState('UZS');
    const [currencyAdvance, setCurrencyAdvance] = useState('UZS');
    const [convertedAmount, setConvertedAmount] = useState('');
    const [convertedAdvance, setConvertedAdvance] = useState('');
    const [exchangeRate, setExchangeRate] = useState(null);

    // Загружаем данные при монтировании компонента
    useEffect(() => {
        async function fetchData() {
            try {
                const [clientsData, workersData, servicesData] = await Promise.all([
                    getClients(),
                    getWorkers(),
                    getServices(),
                ]);

                setClients(clientsData.data);
                setWorkers(workersData.data);
                setServices(servicesData.data);

                // Инициализируем состояния на основе переданного события
                initializeEventData(event);
                setLoading(false);
            } catch (error) {
                console.error('Ошибка при загрузке данных:', error);
                setLoading(false);
                toast.error('Ошибка при загрузке данных');
            }
        }

        async function fetchExchangeRate() {
            const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD'); // Замените на ваш API
            setExchangeRate(response.data.rates.UZS);
        }

        fetchExchangeRate();
        fetchData();
    }, [event]);

    // Инициализация данных события
    const initializeEventData = (eventData) => {
        setClientName(eventData.client.name);
        setIsVIP(eventData.client.is_vip);
        setPhoneNumbers(eventData.client.phones);
        setSelectedWorkers(eventData.workers);
        setTotalAmount(eventData.amount);
        setAdvancePayment(eventData.advance);
        setGeneralComment(eventData.comment);

        // Инициализация выбранных услуг
        const initialSelectedServices = eventData.devices.map((device) => ({
            service: device.service,
            eventDate: device.event_service_date,
            restaurant_name: device.restaurant_name,
            cameraCount: device.camera_count,
            comment: device.comment,
        }));
        setSelectedServices(initialSelectedServices);
    };

    // Функция для форматирования чисел с пробелами
    const formatNumber = (num) => {
        if (!num) return '';
        const parts = num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return parts.join(".");
    };

    // Обработчики изменения сумм с конвертацией
    const handleAmountChange = (e) => {
        const value = e.target.value.replace(/\s/g, '');
        setTotalAmount(value);

        if (currency === 'USD' && exchangeRate) {
            const converted = (value * exchangeRate).toFixed(2);
            setConvertedAmount(formatNumber(converted));
        } else {
            setConvertedAmount(formatNumber(value));
        }
    };

    const handleAdvanceChange = (e) => {
        const value = e.target.value.replace(/\s/g, '');
        setAdvancePayment(value);

        if (currencyAdvance === 'USD' && exchangeRate) {
            const converted = (value * exchangeRate).toFixed(2);
            setConvertedAdvance(formatNumber(converted));
        } else {
            setConvertedAdvance(formatNumber(value));
        }
    };

    // Обработчики изменения валюты
    const handleCurrencyChange = (e) => {
        const selectedCurrency = e.target.value;
        if (selectedCurrency === 'USD' && currency === 'UZS' && exchangeRate) {
            // Конвертируем из UZS в USD при переключении на USD
            const converted = (parseInt(totalAmount) / exchangeRate);
            setTotalAmount(converted);
            setConvertedAmount(formatNumber(totalAmount));
        } else if (selectedCurrency === 'UZS' && currency === 'USD' && exchangeRate) {
            // Конвертируем из USD в UZS при переключении на UZS
            const converted = (parseInt(totalAmount) * exchangeRate);
            setTotalAmount(converted);
            setConvertedAmount(formatNumber(totalAmount));
        }
        setCurrency(selectedCurrency);
    };

    const handleCurrencyChangeAdvance = (e) => {
        const selectedCurrencyAdvance = e.target.value;
        if (selectedCurrencyAdvance === 'USD' && currencyAdvance === 'UZS' && exchangeRate) {
            // Конвертируем из UZS в USD при переключении на USD
            const converted = (parseInt(advancePayment) / exchangeRate);
            setAdvancePayment(converted);
            setConvertedAdvance(formatNumber(advancePayment));
        } else if (selectedCurrencyAdvance === 'UZS' && currencyAdvance === 'USD' && exchangeRate) {
            // Конвертируем из USD в UZS при переключении на UZS
            const converted = (parseInt(advancePayment) * exchangeRate);
            setAdvancePayment(converted);
            setConvertedAdvance(formatNumber(advancePayment));
        }
        setCurrencyAdvance(selectedCurrencyAdvance);
    };

    // Добавить второй телефон
    const addPhoneField = () => {
        if (phoneNumbers.length < 2) {
            setPhoneNumbers([...phoneNumbers, {phone_number: ''}]);
        }
    };

    // Удалить второй телефон
    const removePhoneField = () => {
        if (phoneNumbers.length > 1) {
            setPhoneNumbers([phoneNumbers[0]]);
        }
    };

    // Обновление телефонов
    const handlePhoneChange = (index, value) => {
        const updatedPhones = [...phoneNumbers];
        updatedPhones[index] = {
            phone_number: value.replace(/\D/g, '').slice(0, 15),
        };
        setPhoneNumbers(updatedPhones);
    };

    // Обновление состояния выбранных услуг
    const handleServiceChange = (serviceId) => {
        const serviceIndex = selectedServices.findIndex(
            (service) => service.service === serviceId
        );
        if (serviceIndex > -1) {
            // Если услуга уже выбрана, удаляем её
            setSelectedServices(
                selectedServices.filter((service) => service.service !== serviceId)
            );
        } else {
            // Если услуга не выбрана, добавляем её в список выбранных услуг
            const serviceToAdd = services.find((service) => service.id === serviceId);
            setSelectedServices([
                ...selectedServices,
                {
                    service: serviceToAdd.id,
                    eventDate: '',
                    cameraCount: 0,
                    comment: '',
                },
            ]);
        }
    };

    // Функция для обновления выбранной услуги
    const updateSelectedService = (serviceId, updates) => {
        setSelectedServices((prevServices) =>
            prevServices.map((service) =>
                service.service === serviceId ? {...service, ...updates} : service
            )
        );
    };

    // Валидация полей перед сохранением
    const validateFields = () => {
        const newErrors = {};

        const totalAmountNum = parseFloat(totalAmount);
        const advancePaymentNum = parseFloat(advancePayment);

        // Проверка обязательных полей
        if (!clientName) newErrors.clientName = 'Имя клиента обязательно';
        if (!phoneNumbers[0].phone_number)
            newErrors.phoneNumbers = 'Первый номер телефона обязателен';
        if (isNaN(totalAmountNum) || totalAmountNum <= 0)
            newErrors.totalAmount = 'Общая сумма должна быть больше нуля';
        if (isNaN(advancePaymentNum) || advancePaymentNum < 0)
            newErrors.advancePayment = 'Аванс не может быть отрицательным';

        // Проверяем, что каждая услуга содержит необходимые данные
        selectedServices.forEach((service) => {

            if (
                services.find((s) => s.id === service.service)?.is_active_camera &&
                (!service.cameraCount || isNaN(parseInt(service.cameraCount)))
            ) {
                newErrors[`service_${service.service}_cameraCount`] =
                    'Количество камер должно быть числом';
            }
        });

        // Возвращаем объект ошибок
        return newErrors;
    };

    const handleSave = async () => {
        if (isSaving.current) {
            // Если сохранение уже идёт, не позволяем вызвать функцию снова
            return;
        }

        const validationErrors = validateFields();

        if (Object.keys(validationErrors).length > 0) {
            // Отображаем ошибки с помощью toast
            const errorMessages = Object.values(validationErrors);
            errorMessages.forEach((error) => {
                toast.error(error, {
                    style: {
                        background: '#f44336',
                        color: '#fff',
                    },
                    iconTheme: {
                        primary: '#fff',
                        secondary: '#f44336',
                    },
                });
            });
            // Обновляем состояние ошибок, если вам это нужно в дальнейшем
            setErrors(validationErrors);
            return;
        }

        // Устанавливаем флаг сохранения в true
        isSaving.current = true;
        setSaving(true);

        const eventData = {
            id: event.id, // Добавляем ID события для обновления
            client: {name: clientName, is_vip: isVIP, phones: phoneNumbers},
            devices: selectedServices.map((service) => ({
                service: service.service,
                camera_count: parseInt(service.cameraCount) || 0,
                restaurant_name: service.restaurant_name,
                comment: service.comment,
                event_service_date: service.eventDate || null,
            })),
            workers: selectedWorkers,
            amount: convertedAmount ? parseInt(convertedAmount.replace(/\s/g, '')) : parseInt(totalAmount),
            advance: convertedAdvance ? parseInt(convertedAdvance.replace(/\s/g, '')) : parseInt(advancePayment),
            comment: generalComment,
        };
        console.log();
        try {
            // Обновляем событие на сервере
            const response = await updateEvent(event.id, eventData);
            const updatedEvent = response.data; // Получаем обновленные данные события

            // Вызываем onUpdate с данными обновленного события
            onUpdate(updatedEvent);

            onClose();
            toast.success('Событие успешно обновлено!', {
                style: {
                    background: '#4caf50',
                    color: '#fff',
                },
                iconTheme: {
                    primary: '#fff',
                    secondary: '#4caf50',
                },
            });
        } catch (error) {
            console.error('Error updating event:', error);
            if (error.response && error.response.data) {
                console.error('Детали ошибки:', error.response.data);
                const serverErrors = Object.values(error.response.data);
                serverErrors.forEach((errorMsg) => {
                    toast.error(errorMsg, {
                        style: {
                            background: '#f44336',
                            color: '#fff',
                        },
                        iconTheme: {
                            primary: '#fff',
                            secondary: '#f44336',
                        },
                    });
                });
            } else {
                toast.error('Произошла непредвиденная ошибка', {
                    style: {
                        background: '#f44336',
                        color: '#fff',
                    },
                    iconTheme: {
                        primary: '#fff',
                        secondary: '#f44336',
                    },
                });
            }
        } finally {
            // Сбрасываем флаг сохранения
            isSaving.current = false;
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="modal modal-open">
                <div className="modal-box max-w-[55%]">
                    <p>Загрузка данных...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="modal modal-open">
                {/* Адаптивная ширина модального окна */}
                <div className="modal-box w-full max-w-4xl">
                    <h3 className="font-bold text-lg text-white">Редактировать Событие</h3>
                    <hr className="my-4"/>

                    {/* Имя клиента */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Имя клиента</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Введите имя клиента"
                            className="input input-bordered"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                        />
                    </div>

                    {/* Чекбокс VIP */}
                    <div className="form-control">
                        <label className="cursor-pointer label">
                            <span className="label-text">VIP клиент</span>
                            <input
                                type="checkbox"
                                className="toggle toggle-accent"
                                checked={isVIP}
                                onChange={() => setIsVIP(!isVIP)}
                            />
                        </label>
                    </div>

                    {/* Адаптивная раскладка для телефона и ресторана */}
                    <div className="flex flex-col md:flex-row md:justify-between mt-4 gap-4">
                        {/* Телефонные номера */}
                        <div className="w-full md:w-1/2">
                            {phoneNumbers.map((phone, index) => (
                                <div key={index} className="form-control">
                                    <label className="label">
                                        <span className="label-text">Телефон {index + 1}</span>
                                    </label>
                                    <IMaskInput
                                        mask="+998 00 000 00 00"
                                        lazy={false}
                                        value={phone.phone_number}
                                        onAccept={(value) => handlePhoneChange(index, value)}
                                        placeholder="+998 90 123 45 67"
                                        className="input input-bordered w-full"
                                    />
                                </div>
                            ))}

                            {phoneNumbers.length < 2 && (
                                <button
                                    className="btn btn-outline btn-accent mt-2"
                                    onClick={addPhoneField}
                                >
                                    Добавить телефон
                                </button>
                            )}

                            {phoneNumbers.length > 1 && (
                                <button
                                    className="btn btn-outline btn-error mt-2"
                                    onClick={removePhoneField}
                                >
                                    Удалить второй телефон
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Услуги */}
                    <div className="form-control mt-4">
                        <label className="label">
                            <span className="label-text">Услуги</span>
                        </label>
                        {services.map((service) => (
                            <div
                                key={service.id}
                                className="flex flex-col md:flex-row md:items-center gap-4 mb-4"
                            >
                                <label className="cursor-pointer flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={selectedServices.some(
                                            (s) => s.service === service.id
                                        )}
                                        onChange={() => handleServiceChange(service.id)}
                                    />
                                    <span>{service.name}</span>
                                </label>

                                {/* Поля для выбранных услуг */}
                                {selectedServices.some((s) => s.service === service.id) && (
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* Дата */}
                                        <input
                                            type="date"
                                            className="input input-bordered"
                                            value={
                                                selectedServices.find(
                                                    (s) => s.service === service.id
                                                )?.eventDate || ''
                                            }
                                            onChange={(e) =>
                                                updateSelectedService(service.id, {
                                                    eventDate: e.target.value,
                                                })
                                            }
                                        />

                                        {/* Название ресторана */}
                                        {service.is_active_camera && (
                                            <input
                                                type="text"
                                                placeholder="Название ресторана"
                                                className="input input-bordered"
                                                value={
                                                    selectedServices.find(
                                                        (s) => s.service === service.id
                                                    )?.restaurant_name || ''
                                                }
                                                onChange={(e) =>
                                                    updateSelectedService(service.id, {
                                                        restaurant_name: e.target.value,
                                                    })
                                                }
                                            />
                                        )}

                                        {/* Количество камер для активных камер */}
                                        {service.is_active_camera && (
                                            <input
                                                type="text"
                                                placeholder="Количество камер"
                                                className="input input-bordered"
                                                value={
                                                    selectedServices.find(
                                                        (s) => s.service === service.id
                                                    )?.cameraCount || ''
                                                }
                                                onChange={(e) =>
                                                    updateSelectedService(service.id, {
                                                        cameraCount: e.target.value,
                                                    })
                                                }
                                            />
                                        )}

                                        {/* Комментарий */}
                                        <input
                                            type="text"
                                            placeholder="Комментарий"
                                            className="input input-bordered"
                                            value={
                                                selectedServices.find(
                                                    (s) => s.service === service.id
                                                )?.comment || ''
                                            }
                                            onChange={(e) =>
                                                updateSelectedService(service.id, {
                                                    comment: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Работники */}
                    <div className="form-control mt-4">
                        <label className="label">
                            <span className="label-text">Работники</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {workers.map((worker) => (
                                <div key={worker.id} className="flex gap-2 items-center">
                                    <label className="cursor-pointer flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-primary"
                                            checked={selectedWorkers.includes(worker.id)}
                                            onChange={() => {
                                                const updatedWorkers = selectedWorkers.includes(
                                                    worker.id
                                                )
                                                    ? selectedWorkers.filter((id) => id !== worker.id)
                                                    : [...selectedWorkers, worker.id];
                                                setSelectedWorkers(updatedWorkers);
                                            }}
                                        />
                                        <span>{worker.name}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Адаптивная раскладка для суммы, аванса и комментария */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mt-4 gap-4">
                        <div className="w-full md:w-1/2">
                            {/* Общая сумма */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Общая сумма</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Общая сумма"
                                        className="input input-bordered"
                                        value={formatNumber(totalAmount)}
                                        onChange={handleAmountChange}
                                    />
                                    <select value={currency} onChange={handleCurrencyChange}
                                            className="select select-primary">
                                        <option value="USD">USD</option>
                                        <option value="UZS">UZS</option>
                                    </select>
                                </div>
                                {currency === 'USD' && (
                                    <div>
                                        <strong>Конвертированная сумма: </strong>
                                        {convertedAmount} UZS
                                    </div>
                                )}
                            </div>

                            {/* Аванс */}
                            <div className="form-control mt-4">
                                <label className="label">
                                    <span className="label-text">Аванс</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Аванс"
                                        className="input input-bordered"
                                        value={formatNumber(advancePayment)}
                                        onChange={handleAdvanceChange}
                                    />
                                    <select value={currencyAdvance} onChange={handleCurrencyChangeAdvance}
                                            className="select select-primary">
                                        <option value="USD">USD</option>
                                        <option value="UZS">UZS</option>
                                    </select>
                                </div>
                                {currencyAdvance === 'USD' && (
                                    <div>
                                        <strong>Конвертированная сумма: </strong>
                                        {convertedAdvance} UZS
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Общий комментарий */}
                        <div className="w-full md:w-1/2">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Общий комментарий</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered"
                                    rows="4"
                                    placeholder="Комментарий"
                                    value={generalComment}
                                    onChange={(e) => setGeneralComment(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Действия */}
                    <div className="modal-action">
                        <button
                            className={`btn btn-primary ${saving ? 'loading' : ''}`}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button className="btn" onClick={onClose} disabled={saving}>
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
            {/* Контейнер для уведомлений */}
            <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                    // Настройки по умолчанию для всех уведомлений
                    style: {
                        padding: '16px',
                        color: '#fff',
                    },
                }}
            />
        </>
    );
};

export default EditEventModal;
