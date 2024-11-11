import React, {useEffect, useRef, useState} from 'react';
import {IMaskInput} from 'react-imask';
import {createEvent, getClients, getServices, getWorkers} from '../api';
import {toast, Toaster} from 'react-hot-toast';
import axios from "axios";

const AddEventModal = ({onClose, onSave}) => {
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

    // Курс обмена
    const [currency, setCurrency] = useState('USD');
    const [currencyAdvance, setCurrencyAdvance] = useState('USD');
    const [convertedAmount, setConvertedAmount] = useState('');
    const [convertedAdvance, setConvertedAdvance] = useState('');
    const [exchangeRate, setExchangeRate] = useState(null);

    // Флаг сохранения
    const [saving, setSaving] = useState(false);
    const isSaving = useRef(false);

    // Флаг загрузки данных
    const [loading, setLoading] = useState(true);

    // Получение данных при монтировании компонента
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
    }, []);

    // Функция для корректного форматирования чисел
    const formatNumber = (num) => {
        if (!num) return '';
        const parts = num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return parts.join(".");
    };

    // Обработчик изменения суммы
    const handleAmountChange = (e) => {
        const value = e.target.value.replace(/\s/g, '');
        setTotalAmount(value);

        if (currency === 'USD' && exchangeRate) {
            const converted = (value * exchangeRate);
            setConvertedAmount(formatNumber(converted));
        } else {
            setConvertedAmount(formatNumber(value));
        }
    };

    // Обработчик изменения аванса
    const handleAdvanceChange = (e) => {
        const value = e.target.value.replace(/\s/g, '');
        setAdvancePayment(value);

        if (currencyAdvance === 'USD' && exchangeRate) {
            const converted = (value * exchangeRate);
            setConvertedAdvance(formatNumber(converted));
        } else {
            setConvertedAdvance(formatNumber(value));
        }
    };

    // Обработчик изменения валюты для общей суммы
    const handleCurrencyChange = (e) => {
        const selectedCurrency = e.target.value;
        setCurrency(selectedCurrency);

        if (selectedCurrency === 'USD' && exchangeRate) {
            const converted = (totalAmount * exchangeRate);
            setConvertedAmount(formatNumber(converted));
        } else {
            setConvertedAmount(formatNumber(totalAmount));
        }
    };

    // Обработчик изменения валюты для аванса
    const handleCurrencyChangeAdvance = (e) => {
        const selectedCurrencyAdvance = e.target.value;
        setCurrencyAdvance(selectedCurrencyAdvance);

        if (selectedCurrencyAdvance === 'USD' && exchangeRate) {
            const converted = (advancePayment * exchangeRate);
            setConvertedAdvance(formatNumber(converted));
        } else {
            setConvertedAdvance(formatNumber(advancePayment));
        }
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

    // Обновление выбранных услуг
    const handleServiceChange = (serviceId) => {
        const serviceIndex = selectedServices.findIndex(
            (service) => service.service === serviceId
        );
        if (serviceIndex > -1) {
            // Удаляем услугу, если она уже выбрана
            setSelectedServices(
                selectedServices.filter((service) => service.service !== serviceId)
            );
        } else {
            // Добавляем услугу, если она не выбрана
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

    // Обновление данных выбранной услуги
    const updateSelectedService = (serviceId, updates) => {
        setSelectedServices((prevServices) =>
            prevServices.map((service) =>
                service.service === serviceId ? {...service, ...updates} : service
            )
        );
    };

    // Валидация полей
    const validateFields = () => {
        const newErrors = {};

        const totalAmountNum = parseFloat(convertedAmount.replace(/\s/g, ''));
        const advancePaymentNum = parseFloat(convertedAdvance.replace(/\s/g, ''));

        // Проверка обязательных полей
        if (!clientName) newErrors.clientName = 'Имя клиента обязательно';
        if (!phoneNumbers[0].phone_number)
            newErrors.phoneNumbers = 'Первый номер телефона обязателен';
        if (isNaN(totalAmountNum))
            newErrors.totalAmount = 'Общая сумма должна быть больше нуля';
        if (isNaN(advancePaymentNum) || advancePaymentNum < 0)
            newErrors.advancePayment = 'Аванс не может быть отрицательным';
        if (advancePaymentNum > totalAmountNum)
            newErrors.advancePayment = 'Аванс не может превышать общую сумму';

        // Проверка выбранных услуг
        selectedServices.forEach((service) => {
            if (
                services.find((s) => s.id === service.service)?.is_active_camera &&
                (!service.cameraCount || isNaN(parseInt(service.cameraCount)))
            ) {
                newErrors[`service_${service.service}_cameraCount`] =
                    'Количество камер должно быть числом';
            }
        });

        return newErrors;
    };

    // Обработчик сохранения
    const handleSave = async () => {
        if (isSaving.current) {
            return;
        }

        const validationErrors = validateFields();

        if (Object.keys(validationErrors).length > 0) {
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
            setErrors(validationErrors);
            return;
        }

        isSaving.current = true;
        setSaving(true);

        const eventData = {
            client: {name: clientName, is_vip: isVIP, phones: phoneNumbers},
            devices: selectedServices.map((service) => ({
                service: service.service,
                camera_count: parseInt(service.cameraCount) || 0,
                restaurant_name: service.restaurantName,
                comment: service.comment,
                event_service_date: service.eventDate,
            })),
            workers: selectedWorkers,
            amount: parseInt(convertedAmount.replace(/\s/g, '')),
            advance: parseInt(convertedAdvance.replace(/\s/g, '')),
            comment: generalComment,
        };

        console.log(eventData)

        console.log(parseInt(convertedAmount.replace(/\s/g, '')));

        try {
            const response = await createEvent(eventData);
            const createdEvent = response.data;

            onSave(createdEvent);
            onClose();
            toast.success('Событие успешно создано!', {
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
            console.error('Error creating event:', error);
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
                <div className="modal-box w-full max-w-4xl">
                    <h3 className="font-bold text-lg text-white">Добавить Событие</h3>
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

                    {/* Телефон и ресторан */}
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
                            <div key={service.id} className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
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
                                                    )?.restaurantName || ''
                                                }
                                                onChange={(e) =>
                                                    updateSelectedService(service.id, {
                                                        restaurantName: e.target.value,
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
                                                const updatedWorkers = selectedWorkers.includes(worker.id)
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

                    {/* Сумма, аванс и комментарий */}
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
                            <div className="form-control">
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

                    {/* Кнопки действий */}
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
                    style: {
                        padding: '16px',
                        color: '#fff',
                    },
                }}
            />
        </>
    );
};

export default AddEventModal;
