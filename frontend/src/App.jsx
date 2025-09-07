import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import {useEffect, useState, useContext} from "react";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import ClientPage from "./pages/ClientPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import {jwtDecode} from "jwt-decode";
import {getUser} from "./api";
import SettingsPage from "./pages/SettingsPage.jsx";
import EventPage from "./pages/EventPage.jsx";
import BaseContex, {GlobalContext} from "./components/BaseContex.jsx";
import {getTokenStorage, isAdmin, canViewStatistics, getUserRole} from "./utils/roles.js";

function AppContent({onLogout}) {
    const {isAuthenticated, user} = useContext(GlobalContext);
    
    return (
        <Router>
            <Routes>
                {isAuthenticated ? (
                    <Route path="/" element={<Layout user={user} onLogout={onLogout}/>}>
                        {(() => {
                            const canViewStats = canViewStatistics(user);
                            return canViewStats ? (
                                <Route index element={<HomePage/>}/>
                            ) : (
                                <Route index element={<EventPage/>}/>
                            );
                        })()}
                        {isAdmin(user) && <Route path="/settings" element={<SettingsPage/>}/>}
                        {isAdmin(user) && <Route path="/clients" element={<ClientPage/>}/>}
                        <Route path="/profile" element={<ProfilePage user={user}/>}/>
                        <Route path="/events" element={<EventPage/>}/>
                        <Route path="*" element={<Navigate to="/" replace/>}/>
                    </Route>
                ) : (
                    <>
                        <Route
                            path="/login"
                            element={<LoginPage />}
                        />
                        <Route path="*" element={<Navigate to="/login" replace/>}/>
                    </>
                )}
            </Routes>
        </Router>
    );
}

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Проверка токена из нужного хранилища
    const getToken = () => {
        return sessionStorage.getItem("token") || localStorage.getItem("token");
    };

    // Проверка срока действия токена
    const checkTokenExpiration = async () => {
        const token = getToken();

        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                if (decodedToken.exp < currentTime) {
                    handleLogout(); // Токен истек
                } else {
                    setIsAuthenticated(true); // Токен действителен
                    await fetchUserProfile(decodedToken.user_id); // Получаем профиль пользователя
                }
            } catch (error) {
                console.error("Ошибка при декодировании токена:", error);
                handleLogout(); // При ошибке выходим
            }
        } else {
            setIsAuthenticated(false);
            setIsLoading(false); // Нет токена, завершаем загрузку
        }
    };

    // Получение профиля пользователя
    const fetchUserProfile = async (userId) => {
        try {
            const response = await getUser(userId);
            const userData = response.data;
            setUser(userData);
            setIsAuthenticated(true); // Устанавливаем аутентификацию после получения данных пользователя
            setIsLoading(false); // Завершаем загрузку при успешном получении профиля
        } catch (error) {
            console.error("Ошибка при получении профиля пользователя:", error);
            handleLogout();
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            await checkTokenExpiration();
        };
        
        initializeAuth();

        // Проверка токена каждые 60 секунд
        const interval = setInterval(() => {
            checkTokenExpiration();
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    // Автоматическое удаление токена для админов при закрытии браузера
    useEffect(() => {
        if (isAdmin(user)) {
            const handleBeforeUnload = () => {
                sessionStorage.removeItem("token"); // Удаляем токен только из sessionStorage
                localStorage.removeItem("token");
            };

            window.addEventListener("beforeunload", handleBeforeUnload);

            return () => {
                window.removeEventListener("beforeunload", handleBeforeUnload);
            };
        }
    }, [user]);

    // Функция выхода
    const handleLogout = () => {
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
    };

    // Сохранение токена в нужное хранилище
    const saveToken = (token, user) => {
        const storage = getTokenStorage(user);
        
        if (storage === 'sessionStorage') {
            sessionStorage.setItem("token", token);
        } else {
            localStorage.setItem("token", token);
        }
    };

    // Индикатор загрузки
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-xl text-white">Загрузка...</p>
            </div>
        );
    }
    
    return (
        <BaseContex user={user} setUser={setUser} checkTokenExpiration={checkTokenExpiration} saveToken={saveToken} isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}>
            <AppContent onLogout={handleLogout} />
        </BaseContex>
    );
}

export default App;
