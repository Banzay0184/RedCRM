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
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const {checkTokenExpiration, setIsAuthenticated, saveToken, setUser} = useContext(GlobalContext)

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Включаем индикатор загрузки

        try {
            const response = await login(username, password);
            const token = response.data.access;
            
            // Временно сохраняем токен в localStorage для получения данных пользователя
            localStorage.setItem("token", token);
            
            // Декодируем токен для получения user_id
            const decodedToken = jwtDecode(token);
            
            // Получаем данные пользователя
            const userResponse = await getUser(decodedToken.user_id);
            const user = userResponse.data;
            
            // Сохраняем токен в правильное хранилище
            saveToken(token, user);
            
            // Удаляем временный токен только если он был сохранен в другом хранилище
            const storage = getTokenStorage(user);
            if (storage === 'sessionStorage') {
                localStorage.removeItem("token"); // Удаляем из localStorage, если токен в sessionStorage
            }
            // Если токен в localStorage, не удаляем его
            
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
        } finally {
            setIsLoading(false); // Отключаем индикатор загрузки
        }
    };

    return (
        <div className="login-page">
            <div className="overlay"></div>
            <form onSubmit={handleLogin} className="login-form">
                <h2 className="text-3xl font-bold mb-4 text-center text-white">
                    Авторизоваться
                </h2>

                {error && <p className="text-red-500 mb-4">{error}</p>}

                <div className="mb-4">
                    <label
                        htmlFor="username"
                        className="block text-sm font-medium mb-1 text-white"
                    >
                        Имя пользователя
                    </label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input bg-white text-black input-bordered w-full"
                        required
                        disabled={isLoading}
                        aria-label="Имя пользователя"
                    />
                </div>

                <div className="mb-4 relative">
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium mb-1 text-white"
                    >
                        Пароль
                    </label>
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input bg-white text-black input-bordered w-full"
                        required
                        disabled={isLoading}
                        aria-label="Пароль"
                    />
                    <span
                        className="absolute right-3 top-10 cursor-pointer text-black"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
          </span>
                </div>

                <button
                    type="submit"
                    className={`${isLoading ? "w-full text-white" : "btn btn-accent w-full text-white"}`}
                    disabled={isLoading}
                >
                    {isLoading ? "Загрузка..." : "Вход"}
                </button>
            </form>

            <video className="background-video" autoPlay muted loop>
                <source src="/videologin.mp4" type="video/mp4"/>
                Your browser does not support the video tag.
            </video>
        </div>
    );
}

export default LoginPage;
