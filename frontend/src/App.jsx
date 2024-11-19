import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import {useEffect, useState} from "react";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import ClientPage from "./pages/ClientPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import {jwtDecode} from "jwt-decode";
import {getUser} from "./api";
import SettingsPage from "./pages/SettingsPage.jsx";
import EventPage from "./pages/EventPage.jsx";
import BaseContex from "./components/BaseContex.jsx";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Проверка токена из нужного хранилища
    const getToken = () => {
        return sessionStorage.getItem("token") || localStorage.getItem("token");
    };

    // Проверка срока действия токена
    const checkTokenExpiration = () => {
        const token = getToken();

        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                if (decodedToken.exp < currentTime) {
                    handleLogout(); // Токен истек
                } else {
                    setIsAuthenticated(true); // Токен действителен
                    fetchUserProfile(decodedToken.user_id); // Получаем профиль пользователя
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
            setUser(response.data);
        } catch (error) {
            console.error("Ошибка при получении профиля пользователя:", error);
            handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkTokenExpiration();

        // Проверка токена каждые 60 секунд
        const interval = setInterval(() => {
            checkTokenExpiration();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Автоматическое удаление токена для Rizo при закрытии браузера
    useEffect(() => {
        if (user?.username === "Rizo") {
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
    const saveToken = (token, username) => {
        if (username === "Rizo") {
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
        <BaseContex user={user} setUser={setUser} checkTokenExpiration={checkTokenExpiration}>
            <Router>
                <Routes>
                    {isAuthenticated ? (
                        <Route path="/" element={<Layout onLogout={handleLogout} user={user}/>}>
                            {user?.username === "Rizo" ? (
                                <Route index element={<HomePage/>}/>
                            ) : (
                                <Route index element={<EventPage/>}/>
                            )}
                            <Route path="/settings" element={<SettingsPage/>}/>
                            <Route path="/clients" element={<ClientPage/>}/>
                            <Route path="/profile" element={<ProfilePage user={user}/>}/>
                            <Route path="/events" element={<EventPage/>}/>
                            <Route path="*" element={<Navigate to="/" replace/>}/>
                        </Route>
                    ) : (
                        <>
                            <Route
                                path="/login"
                                element={
                                    isAuthenticated ? (
                                        <Navigate to="/" replace/>
                                    ) : (
                                        <LoginPage
                                            setIsAuthenticated={setIsAuthenticated}
                                            saveToken={(token) => saveToken(token, "Rizo")}
                                        />
                                    )
                                }
                            />
                            <Route path="*" element={<Navigate to="/login" replace/>}/>
                        </>
                    )}
                </Routes>
            </Router>
        </BaseContex>
    );
}

export default App;
