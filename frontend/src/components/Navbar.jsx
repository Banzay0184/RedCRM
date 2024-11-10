import {Link} from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import {useEffect, useState} from "react";
import {FaBars, FaTimes, FaUserCircle} from "react-icons/fa"; // Иконки

function Navbar({onLogout, user}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Для мобильного меню
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
    const [currentTime, setCurrentTime] = useState({hours: 0, minutes: 0, seconds: 0}); // Текущее время

    useEffect(() => {
        const handleThemeChange = () => {
            const currentTheme = localStorage.getItem("theme") || "light";
            setTheme(currentTheme);
        };

        window.addEventListener("storage", handleThemeChange);
        return () => window.removeEventListener("storage", handleThemeChange);
    }, []);

    useEffect(() => {
        const updateCurrentTime = () => {
            const now = new Date();
            setCurrentTime({
                hours: now.getHours(),
                minutes: now.getMinutes(),
                seconds: now.getSeconds(),
            });
        };

        const intervalId = setInterval(updateCurrentTime, 1000); // Обновляем каждую секунду

        return () => clearInterval(intervalId); // Очищаем интервал при размонтировании компонента
    }, []);

    const handleLogout = () => {
        onLogout();
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const onThemeChange = (newTheme) => {
        setTheme(newTheme);
    };

    return (
        <div className={`navbar ${theme === "dark" ? "bg-gray-800" : "bg-base-200"} shadow-lg p-4`}>
            <div className="navbar-start space-x-4">
                <Link to="/" className="btn h-[100%] btn-ghost normal-case text-xl">
                    <img
                        className="w-24"
                        src={theme === "light" ? "/logoRedB.png" : "/logoRedW.png"}
                        alt="logo"
                    />
                </Link>
                <span className="hidden lg:block countdown font-mono text-2xl">
                    <span style={{"--value": currentTime.hours}}></span>:
                    <span style={{"--value": currentTime.minutes}}></span>:
                    <span style={{"--value": currentTime.seconds}}></span>
                </span>
            </div>

            {/* Центр меню для больших экранов */}
            <div className="hidden lg:flex navbar-center">
                <ul className="menu menu-horizontal px-4 space-x-4">
                    <li>
                        <Link to="/clients" className="btn btn-outline btn-primary">
                            Клиенты
                        </Link>
                    </li>
                    <li>
                        <Link to="/events" className="btn btn-outline btn-primary">
                            Мероприятия
                        </Link>
                    </li>
                    <li>
                        <Link to="/settings" className="btn btn-outline btn-primary">
                            Настройка
                        </Link>
                    </li>
                </ul>
            </div>

            <div className="navbar-end flex items-center space-x-4">
                {/* Иконка пользователя и имя */}
                <div className="relative hidden lg:flex items-center space-x-4">
                    <Link to="/profile" className="flex items-center space-x-2">
                        <FaUserCircle className="text-3xl"/>
                        <span className="text-lg">{user?.username || "Логин"}</span> {/* Показываем логин */}
                    </Link>
                    <ThemeToggle onThemeChange={onThemeChange}/>
                    <button
                        className="btn btn-error btn-sm text-white"
                        onClick={handleLogout}
                    >
                        Выйти
                    </button>
                </div>

                {/* Меню для маленьких экранов */}
                <div className="lg:hidden flex items-center space-x-4">
                    <ThemeToggle onThemeChange={onThemeChange}/>
                    <button onClick={toggleMobileMenu}>
                        {isMobileMenuOpen ? <FaTimes className="text-2xl"/> : <FaBars className="text-2xl"/>}
                    </button>
                </div>
            </div>

            {/* Мобильное меню */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden absolute top-[10%] left-0 w-full bg-base-100 shadow-lg z-10 transition-all duration-300">
                    <ul className="flex flex-col items-center p-4 space-y-4">
                        <li>
                            <Link to="/clients" className="hover:text-accent" onClick={toggleMobileMenu}>
                                Клиенты
                            </Link>
                        </li>
                        <li>
                            <Link to="/events" className="hover:text-accent" onClick={toggleMobileMenu}>
                                Мероприятия
                            </Link>
                        </li>
                        <li>
                            <Link to="/settings" className="hover:text-accent " onClick={toggleMobileMenu}>
                                Настройка
                            </Link>
                        </li>
                        <li>
                            <button
                                className="text-red-600 hover:bg-gray-200 px-4 py-2 w-full text-left"
                                onClick={() => {
                                    toggleMobileMenu();
                                    handleLogout();
                                }}
                            >
                                Выйти
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}

export default Navbar;
