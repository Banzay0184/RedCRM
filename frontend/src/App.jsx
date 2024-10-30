import {BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import {useState, useEffect} from "react";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import ClientPage from "./pages/ClientPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import {jwtDecode} from "jwt-decode"; // Исправленный импорт
import {getUser} from "./api";
import EventPage from "./pages/EventPage.jsx"; // Импорт функции для получения профиля

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Состояние загрузки
    const [user, setUser] = useState(null);

    // Проверка срока действия токена
    const checkTokenExpiration = () => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                if (decodedToken.exp < currentTime) {
                    handleLogout(); // Токен истек, выходим
                } else {
                    setIsAuthenticated(true); // Токен действителен
                    fetchUserProfile(decodedToken.user_id); // Получаем профиль пользователя
                }
            } catch (error) {
                console.error("Ошибка при декодировании токена:", error);
                handleLogout(); // При ошибке тоже выходим
            }
        } else {
            setIsAuthenticated(false);
            setIsLoading(false); // Нет токена, завершаем загрузку
        }
    };

    // Функция для получения профиля пользователя
    const fetchUserProfile = async (userId) => {
        try {
            const response = await getUser(userId); // Вызов API для получения профиля
            setUser(response.data);
        } catch (error) {
            console.error("Ошибка при получении профиля пользователя:", error);
            handleLogout(); // Если ошибка, выходим
        } finally {
            setIsLoading(false); // Завершаем загрузку после получения профиля
        }
    };

    useEffect(() => {
        checkTokenExpiration(); // Проверяем токен при загрузке приложения

        // Устанавливаем интервал для проверки токена каждые 60 секунд
        const interval = setInterval(() => {
            checkTokenExpiration();
        }, 60000);

        return () => clearInterval(interval); // Очищаем интервал при размонтировании
    }, []);

    // Функция для выхода
    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setUser(null); // Очищаем данные пользователя
        setIsLoading(false); // Завершаем загрузку
    };

    // Показываем индикатор загрузки, пока приложение загружает данные
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-xl text-white">Загрузка...</p>
            </div>
        );
    }

    // Рендер приложения
    return (
        <Router>
            <Routes>
                {isAuthenticated ? (
                    <Route path="/" element={<Layout onLogout={handleLogout} user={user}/>}>
                        <Route index element={<HomePage/>}/>
                        <Route path="/profile" element={<ProfilePage user={user}/>}/>
                        <Route path="/clients" element={<ClientPage/>}/>
                        <Route path="/events" element={<EventPage/>}/>
                        <Route path="*" element={<Navigate to="/" replace/>}/>
                    </Route>
                ) : (
                    <>
                        <Route
                            path="/login"
                            element={isAuthenticated ? <Navigate to="/" replace/> :
                                <LoginPage setIsAuthenticated={setIsAuthenticated}/>}
                        />
                        <Route path="*" element={<Navigate to="/login" replace/>}/>
                    </>
                )}
            </Routes>
        </Router>
    );
}

export default App;
