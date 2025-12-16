import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import {useEffect, useState, useContext, lazy, Suspense} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {jwtDecode} from "jwt-decode";
import {getUser} from "./api";
import BaseContex, {GlobalContext} from "./components/BaseContex.jsx";
import {getTokenStorage, isAdmin, getUserRole} from "./utils/roles.js";


// Lazy loading для оптимизации bundle size
const LoginPage = lazy(() => import("./pages/LoginPage"));
const Layout = lazy(() => import("./components/Layout"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const EventPage = lazy(() => import("./pages/EventPage.jsx"));
const WorkerPage = lazy(() => import("./pages/WorkerPage.jsx"));

function AppContent({onLogout}) {
    const {isAuthenticated, user} = useContext(GlobalContext);
    
    // Компонент загрузки
    const LoadingFallback = () => (
        <div className="flex items-center justify-center h-screen">
            <span className="loading loading-spinner loading-lg"></span>
        </div>
    );
    
    return (
        <Router>
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    {isAuthenticated ? (
                        <Route path="/" element={<Layout user={user} onLogout={onLogout}/>}>
                            <Route index element={<EventPage/>}/>
                            {isAdmin(user) && <Route path="/settings" element={<SettingsPage/>}/>}
                            {isAdmin(user) && <Route path="/workers" element={<WorkerPage/>}/>}
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
            </Suspense>
        </Router>
    );
}

// Создаем QueryClient с настройками кэширования
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
            cacheTime: 10 * 60 * 1000, // 10 минут - время хранения в кэше
            refetchOnWindowFocus: false, // Не обновлять при фокусе окна
            retry: 1, // Количество повторных попыток при ошибке
        },
    },
});

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Проверка токена из нужного хранилища
    const getToken = () => {
        return sessionStorage.getItem("token") || localStorage.getItem("token");
    };

    // Проверка срока действия токена (только проверка, без запроса профиля)
    const checkTokenExpiration = async (shouldFetchProfile = false) => {
        const token = getToken();

        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                if (decodedToken.exp < currentTime) {
                    handleLogout(); // Токен истек
                } else {
                    // Если нужно получить профиль (только при первой загрузке)
                    if (shouldFetchProfile) {
                        // Сначала проверяем, есть ли пользователь в localStorage
                        const savedUser = localStorage.getItem("user");
                        if (savedUser && !user) {
                            try {
                                const parsedUser = JSON.parse(savedUser);
                                setUser(parsedUser);
                                setIsAuthenticated(true);
                                setIsLoading(false);
                                
                                // Проверяем профиль в фоне для обновления данных
                                fetchUserProfile(decodedToken.user_id, true);
                                return;
                            } catch (error) {
                                localStorage.removeItem("user");
                            }
                        }
                        
                        // Если пользователя нет в localStorage или произошла ошибка, получаем с сервера
                        await fetchUserProfile(decodedToken.user_id);
                    }
                    // Если профиль уже загружен, просто проверяем токен без запроса к серверу
                }
            } catch (error) {
                handleLogout(); // При ошибке выходим
            }
        } else {
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false); // Нет токена, завершаем загрузку
        }
    };

    // Получение профиля пользователя
    const fetchUserProfile = async (userId, isBackgroundUpdate = false) => {
        try {
            const response = await getUser(userId);
            const userData = response.data;
            
            // Если это фоновое обновление и пользователь уже установлен, обновляем только если данные изменились
            if (isBackgroundUpdate && user) {
                const currentUserStr = JSON.stringify(user);
                const newUserStr = JSON.stringify(userData);
                if (currentUserStr === newUserStr) {
                    return;
                }
            }
            
            setUser(userData);
            setIsAuthenticated(true); // Устанавливаем аутентификацию после получения данных пользователя
            setIsLoading(false); // Завершаем загрузку при успешном получении профиля
        } catch (error) {
            // Если это фоновое обновление, не выходим из системы при ошибке
            if (!isBackgroundUpdate) {
                handleLogout();
            }
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            await checkTokenExpiration(true); // При первой загрузке получаем профиль
        };
        
        initializeAuth();

        // Проверка токена каждые 5 минут (только проверка без запроса профиля)
        const interval = setInterval(() => {
            checkTokenExpiration(false); // Только проверка токена, без запроса профиля
        }, 300000); // 5 минут вместо 1 минуты

        return () => clearInterval(interval);
    }, []);

    // Функция выхода
    const handleLogout = () => {
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
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
        <QueryClientProvider client={queryClient}>
            <BaseContex user={user} setUser={setUser} checkTokenExpiration={checkTokenExpiration} saveToken={saveToken} isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}>
                <AppContent onLogout={handleLogout} />
            </BaseContex>
        </QueryClientProvider>
    );
}

export default App;
