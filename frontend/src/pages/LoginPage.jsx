import {useContext, useState} from "react";
import {useNavigate} from "react-router-dom";
import {login} from "../api";
import {GlobalContext} from "../components/BaseContex.jsx";


// Объект для перевода ошибок
const errorTranslations = {
    "Invalid username or password": "Неверное имя пользователя или пароль",
    "User is inactive": "Пользователь неактивен",
    "Credentials were not provided": "Учётные данные не были предоставлены",
};

function translateError(errorMessage) {
    return errorTranslations[errorMessage] || "Неверное имя пользователя или пароль";
}

function LoginPage({setIsAuthenticated}) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const {checkTokenExpiration} = useContext(GlobalContext)

    const handleLogin = async (e) => {

         e.preventDefault();
        setIsLoading(true); // Включаем индикатор загрузки

        try {
            const response = await login(username, password);
            localStorage.setItem("token", response.data.access);
            console.log(response)
            setIsAuthenticated(true);
            checkTokenExpiration()
            navigate("/"); // Перенаправляем на главную страницу
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
