import React, {useEffect, useState} from 'react';

export const GlobalContext = React.createContext({});

function BaseContex({children, setUser, user, checkTokenExpiration, saveToken, isAuthenticated, setIsAuthenticated}) {
    const [refresh, setRefresh] = useState(false)

    // Восстанавливаем пользователя из localStorage при инициализации
    useEffect(() => {
        if (!user) {
            try {
                const savedUser = localStorage.getItem("user");
                if (savedUser) {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                    setIsAuthenticated(true); // Если пользователь восстановлен, считаем его аутентифицированным
                }
            } catch (error) {
                console.error("Ошибка при восстановлении пользователя:", error);
                localStorage.removeItem("user");
            }
        }
    }, [setUser, setIsAuthenticated]);

    useEffect(() => {
        if (!refresh){
            setRefresh(true)
        }
        if (user) {
            localStorage.setItem("user", JSON.stringify(user))
            // Не устанавливаем isAuthenticated здесь, чтобы избежать конфликтов
            // isAuthenticated должен управляться только в App.jsx
        }
        // Убираем автоматический сброс isAuthenticated при отсутствии user
        // Это должно управляться только в App.jsx
    }, [user, refresh]);

    const value = {user, setUser, checkTokenExpiration, isAuthenticated, setIsAuthenticated, saveToken}
    return (
        <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
    );
}

export default BaseContex;