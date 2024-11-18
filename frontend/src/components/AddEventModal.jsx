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
    const [services, setServices] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [totalAmount, setTotalAmount] = useState('');
    const [advancePayment, setAdvancePayment] = useState('');
    const [generalComment, setGeneralComment] = useState('');
    const [computerNumbers, setComputerNumbers] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [currencyAdvance, setCurrencyAdvance] = useState('USD');
    const [convertedAmount, setConvertedAmount] = useState('');
    const [convertedAdvance, setConvertedAdvance] = useState('');
    const [exchangeRate, setExchangeRate] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const isSaving = useRef(false);

    // Получение данных при монтировании компонента
    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            try {
                const [clientsData, workersData, servicesData] = await Promise.all([
                    getClients(),
                    getWorkers(),
                    getServices(),
                ]);

                if (isMounted) {
                    setClients(clientsData.data);
                    setWorkers(workersData.data);
                    setServices(servicesData.data);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Ошибка при загрузке данных:', error);
                setLoading(false);
                toast.error('Ошибка при загрузке данных');
            }
        }

        async function fetchExchangeRate() {
            try {
                const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
                if (isMounted) {
                    setExchangeRate(response.data.rates.UZS);
                }
            } catch (error) {
                console.error('Ошибка при загрузке курса обмена:', error);
                toast.error('Ошибка при загрузке курса обмена');
            }
        }

        fetchExchangeRate();
        fetchData();

        return () => {
            isMounted = false;
        };
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

        // Конвертация только для отображения
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

    // Обработчик изменения аванса
    const handleAdvanceChange = (e) => {
        const value = e.target.value.replace(/\s/g, '');
        setAdvancePayment(value);

        if (currencyAdvance === 'USD' && exchangeRate) {
            const converted = (value * exchangeRate);
            console.log(exchangeRate)
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

    // Обработчик для добавления или удаления рабочих конкретного сервиса
    const handleWorkerChange = (serviceId, workerId) => {
        setSelectedServices(selectedServices.map((s) => {
            if (s.service === serviceId) {
                const newWorkers = s.workers.includes(workerId)
                    ? s.workers.filter(id => id !== workerId)
                    : [...s.workers, workerId];
                return {...s, workers: newWorkers};
            }
            return s;
        }));
    };

    const handleComputerNumbersChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); // Ограничение на ввод только чисел
        setComputerNumbers(value);
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

    // Обработчик выбора сервиса и добавления рабочих в каждый сервис
    const handleServiceChange = (serviceId) => {
        const existingServiceIndex = selectedServices.findIndex(s => s.service === serviceId);
        if (existingServiceIndex > -1) {
            setSelectedServices(selectedServices.filter(s => s.service !== serviceId));
        } else {
            const service = services.find(s => s.id === serviceId);
            setSelectedServices([
                ...selectedServices,
                {service: serviceId, eventDate: '', cameraCount: 0, comment: '', workers: []}
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


        // Проверка обязательных полей
        if (!clientName) newErrors.clientName = 'Имя клиента обязательно';
        if (!phoneNumbers[0].phone_number)
            newErrors.phoneNumbers = 'Первый номер телефона обязателен';


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


        // В функции handleSave замените eventData на следующее:
        const eventData = {
            client: {name: clientName, is_vip: isVIP, phones: phoneNumbers},
            devices: selectedServices.map((service) => ({
                service: service.service,
                camera_count: parseInt(service.cameraCount) || 0,
                restaurant_name: service.restaurantName,
                comment: service.comment,
                workers: service.workers,
                event_service_date: service.eventDate || null,
            })),
            amount: processedAmount,
            amount_money: amountMoney,
            advance: parseInt(processedAdvancePayment),
            advance_money: advanceMoney,
            computer_numbers: parseInt(computerNumbers) || 0,
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
                <div className="modal-box w-full max-w-6xl">
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
                                                placeholder="камер"
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
                                        {service.is_active_camera && (
                                            <div className="form-control">
                                                <div className="dropdown">
                                                    <label tabIndex={0} className="btn btn-outline btn-primary w-full">
                                                        Выберите работников
                                                    </label>
                                                    <ul tabIndex={0}
                                                        className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full">
                                                        {workers.map((worker) => (
                                                            <li key={worker.id} className="flex gap-2 items-center">
                                                                <label
                                                                    className="cursor-pointer flex items-center gap-2">
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
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Сумма, аванс и комментарий */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mt-4 gap-4">
                        <div className="w-full md:w-1/2">
                            {/* Общая сумма */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Общая сумма</span>
                                </label>
                                <div className="flex gap-2 mb-1">
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
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Аванс</span>
                                </label>
                                <div className="flex gap-2 mb-1">
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
                            </div>
                            <label className="label">
                                <span className="label-text">Номер компьютера: </span>
                            </label>
                            <input
                                type="text"
                                placeholder="Номер компьютера"
                                className="input input-bordered"
                                value={computerNumbers}
                                onChange={handleComputerNumbersChange}
                            />
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
