import {useContext, useState} from "react";
import {useNavigate} from "react-router-dom";
import {login, getUser} from "../api";
import {GlobalContext} from "../components/BaseContex.jsx";
import {jwtDecode} from "jwt-decode";
import {getTokenStorage} from "../utils/roles.js";


// Объект для перевода ошибок
const errorTranslations = {
    "Invalid username or password": "Неверное имя пользователя или пароль",
    "User is inactive": "Пользователь неактивен",
    "Credentials were not provided": "Учётные данные не были предоставлены",
};

function translateError(errorMessage) {
    return errorTranslations[errorMessage] || "Неверное имя пользователя или пароль";
}

function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const {checkTokenExpiration, setIsAuthenticated, saveToken, setUser} = useContext(GlobalContext)

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Включаем индикатор загрузки

        try {
            const response = await login(username, password);
            const token = response.data.access;

            // Декодируем токен для получения user_id
            const decodedToken = jwtDecode(token);

            // Временно сохраняем токен для получения данных пользователя
            localStorage.setItem("token", token);

            // Получаем данные пользователя
            const userResponse = await getUser(decodedToken.user_id);
            const user = userResponse.data;

            // Сохраняем токен в правильное хранилище
            saveToken(token, user);

            // Очищаем временный токен, если он был сохранен в другом хранилище
            const storage = getTokenStorage(user);
            if (storage === 'sessionStorage') {
                localStorage.removeItem("token"); // Удаляем из localStorage, если токен в sessionStorage
            }

            // Сначала устанавливаем пользователя, затем аутентификацию
            setUser(user);
            setIsAuthenticated(true);

            // Небольшая задержка для обеспечения обновления состояния
            setTimeout(() => {
                navigate("/"); // Перенаправляем на главную страницу
            }, 100);
        } catch (error) {
            const serverMessage = error.response?.data?.detail || "Unknown error";
            setError(translateError(serverMessage));
            setPassword(""); // Сброс пароля при ошибке

            // Очищаем временный токен при ошибке
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
        } finally {
            setIsLoading(false); // Отключаем индикатор загрузки
        }
    };

    return (
        <div className="flex h-screen w-full bg-gray-950">
            {/* Левая половина — видео на весь рост, скрыта на мобильных */}
            <div className="w-full hidden md:block relative">
                <video className="h-full w-full object-cover" autoPlay muted loop playsInline>
                    <source src="/videologin.mp4" type="video/mp4"/>
                </video>
                <div className="absolute inset-0 bg-black/20"/>
            </div>

            {/* Правая половина — форма входа */}
            <div className="w-full flex flex-col items-center justify-center px-6">
                <img src="/logoRedW.png" alt="RED VIDEO GROUP" className="h-14 mb-10"/>

                <form onSubmit={handleLogin} className="md:w-96 w-80 flex flex-col items-center">
                    <h2 className="text-4xl text-white font-medium">Авторизоваться</h2>
                    <p className="text-sm text-gray-400 mt-3 text-center">
                        Введите данные для входа в систему
                    </p>

                    {error && (
                        <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
                    )}

                    <div className="w-full mt-8">
                        <label htmlFor="username" className="block text-sm text-gray-400 mb-1">
                            Имя пользователя
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-transparent text-white placeholder-gray-500 border border-gray-700 focus:border-accent outline-none rounded-full h-12 px-6"
                            required
                            disabled={isLoading}
                            aria-label="Имя пользователя"
                        />
                    </div>

                    <div className="w-full mt-4">
                        <label htmlFor="password" className="block text-sm text-gray-400 mb-1">
                            Пароль
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-transparent text-white placeholder-gray-500 border border-gray-700 focus:border-accent outline-none rounded-full h-12 px-6"
                            required
                            disabled={isLoading}
                            aria-label="Пароль"
                        />
                    </div>

                    <p className="w-full text-right text-xs text-gray-500 mt-3">
                        Забыли пароль? Обратитесь к администратору
                    </p>

                    <button
                        type="submit"
                        className="mt-8 w-full h-11 rounded-full text-white bg-accent hover:opacity-90 transition-opacity disabled:opacity-60"
                        disabled={isLoading}
                    >
                        {isLoading ? "Загрузка..." : "Войти"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
