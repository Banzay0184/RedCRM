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
    const [clientCount, setClientCount] = useState(0);
    const [eventCount, setEventCount] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalAdvance, setTotalAdvance] = useState(0);
    const [debt, setDebt] = useState(0);
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    useEffect(() => {
        fetchStatistics();
    }, [startDate, endDate]);

    const fetchStatistics = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = {};
            if (startDate) params.start_date = formatDate(startDate);
            if (endDate) params.end_date = formatDate(endDate, true);

            const [clientsRes, eventsRes] = await Promise.all([
                axios.get("/clients/", {params}),
                axios.get("/events/", {params}),
            ]);

            const clients = clientsRes.data;
            const events = eventsRes.data;

            const totalAmount = events.reduce((sum, event) => sum + event.amount, 0);
            const totalAdvance = events.reduce((sum, event) => sum + event.advance, 0);
            const debt = totalAmount - totalAdvance;

            setClientCount(clients.length);
            setEventCount(events.length);
            setTotalAmount(totalAmount);
            setTotalAdvance(totalAdvance);
            setDebt(debt);

            updateChartData(clients.length, events.length);

        } catch (error) {
            console.error("Ошибка при загрузке статистики:", error);
            setError("Не удалось загрузить статистику. Попробуйте позже.");
        } finally {
            setIsLoading(false);
        }
    };

    const updateChartData = (clientCount, eventCount) => {
        const labels = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
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

    const formatDate = (date, endOfDay = false) => {
        const newDate = new Date(date);
        if (endOfDay) {
            newDate.setHours(23, 59, 59, 999);
        } else {
            newDate.setHours(0, 0, 0, 0);
        }
        return newDate.toISOString();
    };

    const formatNumber = (number) => number.toLocaleString("ru-RU");

    const formatCurrency = (number) =>
        new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'UZS'}).format(number);

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
                    className="btn btn-outline"
                    onClick={() => {
                        setStartDate(null);
                        setEndDate(null);
                    }}
                >
                    Сбросить фильтр
                </button>
            </div>

            {/* Ошибка или отсутствие данных */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Количество клиентов" value={formatNumber(clientCount)} icon={FaUsers}/>
                    <StatCard title="Количество событий" value={formatNumber(eventCount)} icon={FaCalendarAlt}/>
                    <StatCard title="Общая сумма" value={formatCurrency(totalAmount)} icon={FaMoneyBillWave}/>
                    <StatCard title="Общий аванс" value={formatCurrency(totalAdvance)} icon={FaHandHoldingUsd}/>
                    <StatCard title="Долг клиентов" value={formatCurrency(debt)} icon={FaExclamationTriangle}/>
                </div>
            )}


            {/* График */}
            {chartData && chartData.datasets.every(dataset => dataset.data.length > 0) ? (
                <div className="my-6 w-full md:w-3/4 lg:w-1/1 mx-auto">
                    <Line data={chartData} options={{responsive: true, maintainAspectRatio: false}}/>
                </div>
            ) : (
                <div className="text-center text-gray-500">Нет данных для отображения графика.</div>
            )}
        </div>
    );
}

export default HomePage;
