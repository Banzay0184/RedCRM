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
    const [computerNumbers, setComputerNumbers] = useState('');
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

                // Загружаем курс обмена
                const exchangeRateResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
                setExchangeRate(exchangeRateResponse.data.rates.UZS);

                // Теперь инициализируем данные события
                initializeEventData(event);

                setLoading(false);
            } catch (error) {
                console.error('Ошибка при загрузке данных:', error);
                setLoading(false);
                toast.error('Ошибка при загрузке данных');
            }
        }

        fetchData();
    }, [event]);

    // Инициализация данных события
    const initializeEventData = (eventData) => {
        setClientName(eventData.client.name);
        setIsVIP(eventData.client.is_vip);
        setPhoneNumbers(eventData.client.phones);
        setSelectedWorkers(eventData.workers);
        setGeneralComment(eventData.comment);
        setComputerNumbers(eventData.computer_numbers);

        // Устанавливаем валюту для amount
        setCurrency(eventData.amount_money ? 'USD' : 'UZS');
        setTotalAmount(eventData.amount.toString());

        // Устанавливаем валюту для advance
        setCurrencyAdvance(eventData.advance_money ? 'USD' : 'UZS');
        setAdvancePayment(eventData.advance.toString());

        // Обновляем конвертированные суммы для отображения
        if (exchangeRate) {
            if (eventData.amount_money) {
                const converted = eventData.amount * exchangeRate;
                setConvertedAmount(formatNumber(converted));
            } else {
                const converted = eventData.amount / exchangeRate;
                setConvertedAmount(formatNumber(converted));
            }

            if (eventData.advance_money) {
                const converted = eventData.advance * exchangeRate;
                setConvertedAdvance(formatNumber(converted));
            } else {
                const converted = eventData.advance / exchangeRate;
                setConvertedAdvance(formatNumber(converted));
            }
        }

        // Инициализация выбранных услуг
        const initialSelectedServices = eventData.devices.map((device) => ({
            service: device.service,
            eventDate: device.event_service_date,
            restaurant_name: device.restaurant_name,
            cameraCount: device.camera_count,
            comment: device.comment,
            workers: device.workers || [],
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

        // Конвертация для отображения
        if (currency === 'USD' && exchangeRate) {
            const converted = value * exchangeRate;
            setConvertedAmount(formatNumber(converted));
        } else if (currency === 'UZS' && exchangeRate) {
            const converted = value / exchangeRate;
            setConvertedAmount(formatNumber(converted));
        } else {
            setConvertedAmount('');
        }
    };

    const handleAdvanceChange = (e) => {
        const value = e.target.value.replace(/\s/g, '');
        setAdvancePayment(value);

        // Конвертация для отображения
        if (currencyAdvance === 'USD' && exchangeRate) {
            const converted = value * exchangeRate;
            setConvertedAdvance(formatNumber(converted));
        } else if (currencyAdvance === 'UZS' && exchangeRate) {
            const converted = value / exchangeRate;
            setConvertedAdvance(formatNumber(converted));
        } else {
            setConvertedAdvance('');
        }
    };

    // Обработчики изменения валюты
    const handleCurrencyChange = (e) => {
        const selectedCurrency = e.target.value;
        setCurrency(selectedCurrency);

        // Обновляем конвертированную сумму для отображения
        if (selectedCurrency === 'USD' && exchangeRate) {
            const converted = totalAmount * exchangeRate;
            setConvertedAmount(formatNumber(converted));
        } else if (selectedCurrency === 'UZS' && exchangeRate) {
            const converted = totalAmount / exchangeRate;
            setConvertedAmount(formatNumber(converted));
        } else {
            setConvertedAmount('');
        }
    };

    const handleCurrencyChangeAdvance = (e) => {
        const selectedCurrencyAdvance = e.target.value;
        setCurrencyAdvance(selectedCurrencyAdvance);

        // Обновляем конвертированную сумму для отображения
        if (selectedCurrencyAdvance === 'USD' && exchangeRate) {
            const converted = advancePayment * exchangeRate;
            setConvertedAdvance(formatNumber(converted));
        } else if (selectedCurrencyAdvance === 'UZS' && exchangeRate) {
            const converted = advancePayment / exchangeRate;
            setConvertedAdvance(formatNumber(converted));
        } else {
            setConvertedAdvance('');
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

    // Обновление состояния выбранных услуг
    const handleServiceChange = (serviceId) => {
        const serviceIndex = selectedServices.findIndex(
            (service) => service.service === serviceId
        );
        if (serviceIndex > -1) {
            if (window.confirm('Вы точно хотите изменить услугу?')) {
                setSelectedServices(
                    selectedServices.filter((service) => service.service !== serviceId)
                );
            }
        } else {
            const serviceToAdd = services.find((service) => service.id === serviceId);
            setSelectedServices([
                ...selectedServices,
                {
                    service: serviceToAdd.id,
                    eventDate: '',
                    cameraCount: 0,
                    comment: '',
                    workers: [],
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

    const handleWorkerChange = (serviceId, workerId) => {
        setSelectedServices(selectedServices.map((service) => {
            if (service.service === serviceId) {
                // Toggle worker presence in the array
                const isWorkerSelected = service.workers.includes(workerId);
                const updatedWorkers = isWorkerSelected
                    ? service.workers.filter(id => id !== workerId) // Remove if already present
                    : [...service.workers, workerId]; // Add if not present

                return {...service, workers: updatedWorkers};
            }
            return service;
        }));
    };


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

        // Обработка amount
        const processedAmount = parseFloat(totalAmount.replace(/\s/g, '')) || 0;
        const amountMoney = currency === 'USD';

        // Обработка advance
        let processedAdvancePayment = parseFloat(advancePayment.replace(/\s/g, '')) || 0;
        let advanceMoney = currencyAdvance === 'USD';

        if (amountMoney) {
            // amount в USD
            if (!advanceMoney) {
                // advance в UZS, нужно конвертировать
                if (exchangeRate) {
                    processedAdvancePayment = processedAdvancePayment / exchangeRate;
                    advanceMoney = true; // Устанавливаем advance_money в True (USD)
                } else {
                    toast.error('Курс обмена недоступен', {
                        style: {
                            background: '#f44336',
                            color: '#fff',
                        },
                        iconTheme: {
                            primary: '#fff',
                            secondary: '#f44336',
                        },
                    });
                    isSaving.current = false;
                    setSaving(false);
                    return;
                }
            }
            // Если advance уже в USD, ничего не делаем
        } else {
            // amount в UZS, advance оставляем как есть
            // processedAdvancePayment и advanceMoney уже установлены
        }

        const eventData = {
            id: event.id,
            client: {name: clientName, is_vip: isVIP, phones: phoneNumbers},
            devices: selectedServices.map((service) => ({
                service: service.service,
                camera_count: parseInt(service.cameraCount) || 0,
                restaurant_name: service.restaurant_name,
                comment: service.comment,
                event_service_date: service.eventDate || null,
                workers: service.workers || [],
            })),
            amount: processedAmount,
            amount_money: amountMoney,
            advance: parseInt(processedAdvancePayment),
            advance_money: advanceMoney,
            comment: generalComment,
            computer_numbers: parseInt(computerNumbers) || 0,
        };

        try {
            // Обновляем событие на сервере
            const response = await updateEvent(event.id, eventData);
            const updatedEvent = response.data;

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
                <div className="modal-box w-full max-w-6xl">
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
                                    <div className="flex flex-col justify-center md:flex-row md:items-center gap-4">
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

                                        {/* Выбор работников для конкретного сервиса */}
                                        <div className="form-control">
                                            <div className="dropdown">
                                                <label tabIndex={0} className="btn btn-outline btn-primary w-full">
                                                    Выберите работников
                                                </label>
                                                <ul tabIndex={0}
                                                    className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full">
                                                    {workers.map((worker) => (
                                                        <li key={worker.id} className="flex gap-2 items-center">
                                                            <label className="cursor-pointer flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    className="checkbox checkbox-primary"
                                                                    checked={selectedServices.find(s => s.service === service.id)?.workers.includes(worker.id) || false}
                                                                    onChange={() => handleWorkerChange(service.id, worker.id)}
                                                                />
                                                                <span>{worker.name}</span>
                                                            </label>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
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
                                        <option value="USD">$</option>
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
                                        <option value="USD">$</option>
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
                                <label className="label">
                                    <span className="label-text">Количество компьютеров</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Введите количество компьютеров"
                                    className="input input-bordered"
                                    value={computerNumbers}
                                    onChange={(e) => setComputerNumbers(e.target.value)}
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
