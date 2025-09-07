import React, {useEffect, useState} from 'react';

export const GlobalContext = React.createContext({});

function BaseContex({children, setUser, user, checkTokenExpiration, saveToken, isAuthenticated, setIsAuthenticated}) {
    const [refresh, setRefresh] = useState(false)

    // Убираем автоматическое восстановление пользователя
    // Аутентификация должна управляться только через токен в App.jsx

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