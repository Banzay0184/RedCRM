import {useEffect, useState} from "react";
import axios from "../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ru from "date-fns/locale/ru";
import StatCard from "../components/StatCard.jsx";
import {Line} from 'react-chartjs-2';
import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip
} from 'chart.js';

// Иконки из react-icons
import {FaCalendarAlt, FaExclamationTriangle, FaHandHoldingUsd, FaMoneyBillWave, FaUsers} from 'react-icons/fa';

ChartJS.register(
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    Legend
);

function HomePage() {
    // Состояния для хранения статистики
    const [clientCount, setClientCount] = useState(0);
    const [eventCount, setEventCount] = useState(0);

    // Состояния для сумм в USD
    const [totalAmountUSD, setTotalAmountUSD] = useState(0);
    const [totalAdvanceUSD, setTotalAdvanceUSD] = useState(0);
    const [debtUSD, setDebtUSD] = useState(0);

    // Состояния для сумм в UZS
    const [totalAmountUZS, setTotalAmountUZS] = useState(0);
    const [totalAdvanceUZS, setTotalAdvanceUZS] = useState(0);
    const [debtUZS, setDebtUZS] = useState(0);

    // Другие состояния
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Состояния для фильтрации по дате
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    // Эффект для загрузки статистики при изменении дат
    useEffect(() => {
        fetchStatistics();
    }, [startDate, endDate]);

    // Функция для загрузки статистики
    const fetchStatistics = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = {};
            if (startDate) params.start_date = formatDate(startDate);
            if (endDate) params.end_date = formatDate(endDate, true);

            // Параллельные запросы на получение клиентов и событий
            const [clientsRes, eventsRes] = await Promise.all([
                axios.get("/clients/", {params}),
                axios.get("/events/", {params}),
            ]);

            const clients = clientsRes.data;
            const events = eventsRes.data;

            // Инициализация сумм
            let totalAmountUSD = 0;
            let totalAdvanceUSD = 0;
            let totalAmountUZS = 0;
            let totalAdvanceUZS = 0;

            // Расчет сумм по валютам
            events.forEach(event => {
                // Обработка amount
                if (event.amount_money) {
                    // Сумма в USD
                    totalAmountUSD += event.amount;
                } else {
                    // Сумма в UZS
                    totalAmountUZS += event.amount;
                }

                // Обработка advance
                if (event.advance_money) {
                    // Аванс в USD
                    totalAdvanceUSD += event.advance;
                } else {
                    // Аванс в UZS
                    totalAdvanceUZS += event.advance;
                }
            });

            // Расчет долга по валютам
            const debtUSD = totalAmountUSD - totalAdvanceUSD;
            const debtUZS = totalAmountUZS - totalAdvanceUZS;

            // Обновление состояний
            setClientCount(clients.length);
            setEventCount(events.length);
            setTotalAmountUSD(totalAmountUSD);
            setTotalAdvanceUSD(totalAdvanceUSD);
            setDebtUSD(debtUSD);
            setTotalAmountUZS(totalAmountUZS);
            setTotalAdvanceUZS(totalAdvanceUZS);
            setDebtUZS(debtUZS);

            // Обновление данных для графика (если требуется)
            updateChartData(clients.length, events.length);

        } catch (error) {
            console.error("Ошибка при загрузке статистики:", error);
            setError("Не удалось загрузить статистику. Попробуйте позже.");
        } finally {
            setIsLoading(false);
        }
    };

    // Функция для обновления данных графика (если используется)
    const updateChartData = (clientCount, eventCount) => {
        const labels = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
        const data = {
            labels,
            datasets: [
                {
                    label: "Количество клиентов",
                    data: labels.map(() => clientCount),
                    borderColor: "rgba(75, 192, 192, 1)",
                    fill: false,
                },
                {
                    label: "Количество событий",
                    data: labels.map(() => eventCount),
                    borderColor: "rgba(255, 99, 132, 1)",
                    fill: false,
                },
            ],
        };
        setChartData(data);
    };

    // Функция для форматирования даты
    const formatDate = (date, endOfDay = false) => {
        const newDate = new Date(date);
        if (endOfDay) {
            newDate.setHours(23, 59, 59, 999);
        } else {
            newDate.setHours(0, 0, 0, 0);
        }
        return newDate.toISOString();
    };

    // Функция для форматирования чисел с разделителем тысяч
    const formatNumber = (number) => number.toLocaleString("ru-RU");

    // Функция для форматирования валюты
    const formatCurrency = (number, isUSD) =>
        new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: isUSD ? 'USD' : 'UZS',
            minimumFractionDigits: isUSD ? 2 : 0,
            maximumFractionDigits: isUSD ? 2 : 0,
        }).format(number);

    return (
        <div className="relative p-6 bg-base-100 min-h-screen transition-all duration-300 ease-in-out">
            {isLoading && (
                <div className="absolute top-4 right-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-accent"></div>
                </div>
            )}

            <h1 className="text-3xl font-bold mb-6 text-center">Статистика</h1>

            {/* Фильтр по датам */}
            <div
                className="flex flex-col justify-center items-center mb-8 space-x-0 md:items-end md:space-x-4 md:flex-row">
                <div>
                    <label className="block text-sm font-medium mb-1">Дата начала</label>
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        className="input input-bordered"
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        dateFormat="dd/MM/yyyy"
                        locale={ru}
                        isClearable
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Дата окончания</label>
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        className="input input-bordered"
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        dateFormat="dd/MM/yyyy"
                        locale={ru}
                        isClearable
                    />
                </div>
                <button
                    className="btn btn-outline mt-4 md:mt-0"
                    onClick={() => {
                        setStartDate(null);
                        setEndDate(null);
                    }}
                >
                    Сбросить фильтр
                </button>
            </div>

            {/* Отображение ошибки или отсутствия данных */}
            {error ? (
                <div className="text-center text-red-500 text-lg">
                    {error}
                    <button className="btn mt-4" onClick={fetchStatistics}>
                        Попробовать снова
                    </button>
                </div>
            ) : clientCount === 0 && eventCount === 0 ? (
                <div className="text-center text-gray-500 text-lg">
                    Нет данных для выбранного периода.
                </div>
            ) : (
                // Отображение статистики
                <>
                    {/* Первый ряд: USD */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        <StatCard
                            title="Количество клиентов"
                            value={formatNumber(clientCount)}
                            icon={FaUsers}
                        />
                        <StatCard
                            title="Количество событий"
                            value={formatNumber(eventCount)}
                            icon={FaCalendarAlt}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 gap-6">
                        <StatCard
                            title="Общая сумма (USD)"
                            value={formatCurrency(totalAmountUSD, true)}
                            icon={FaMoneyBillWave}
                        />
                        <StatCard
                            title="Общий аванс (USD)"
                            value={formatCurrency(totalAdvanceUSD, true)}
                            icon={FaHandHoldingUsd}
                        />
                        <StatCard
                            title="Долг клиентов (USD)"
                            value={formatCurrency(debtUSD, true)}
                            icon={FaExclamationTriangle}
                        />
                    </div>
                    {/* Второй ряд: UZS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard
                            title="Общая сумма (UZS)"
                            value={formatCurrency(totalAmountUZS, false)}
                            icon={FaMoneyBillWave}
                        />
                        <StatCard
                            title="Общий аванс (UZS)"
                            value={formatCurrency(totalAdvanceUZS, false)}
                            icon={FaHandHoldingUsd}
                        />
                        <StatCard
                            title="Долг клиентов (UZS)"
                            value={formatCurrency(debtUZS, false)}
                            icon={FaExclamationTriangle}
                        />
                    </div>
                </>
            )}

            {/* График (если требуется) */}
            {chartData && chartData.datasets.every(dataset => dataset.data.length > 0) ? (
                <div className="my-6 w-full md:w-3/4 lg:w-full mx-auto">
                    <Line data={chartData} options={{responsive: true, maintainAspectRatio: false}}/>
                </div>
            ) : (
                <div className="text-center text-gray-500 mt-6">
                    Нет данных для отображения графика.
                </div>
            )}
        </div>
    );
}

export default HomePage;
