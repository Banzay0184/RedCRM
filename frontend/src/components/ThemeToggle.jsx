import { useState, useEffect } from "react";

function ThemeToggle({ onThemeChange }) {
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
        onThemeChange(theme); // Уведомляем родительский компонент о смене темы
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
    };

    return (
        <button className="btn btn-ghost" onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
    );
}

export default ThemeToggle;
