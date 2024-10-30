// components/Layout.jsx
import Navbar from "./Navbar";
import {Outlet} from "react-router-dom"; // Outlet для вложенных маршрутов

function Layout({onLogout, user}) {
    return (
        <div className="min-h-screen flex flex-col bg-base-100">
            {/* Navbar всегда виден */}
            <Navbar onLogout={onLogout} user={user}/>

            {/* Основной контент страницы */}
            <main className="flex-grow p-6">
                <Outlet/> {/* Компонент для отображения текущего маршрута */}
            </main>

            {/* Footer, если нужен */}
            <footer className="p-4 bg-base-200 text-center">
                <p>© 2024 OOO "AB Labs". Все права защищены.</p>
                <p>+998904140184</p>
            </footer>
        </div>
    );
}

export default Layout;
