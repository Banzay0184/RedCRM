import React, {useEffect, useState, useMemo} from 'react';
import {getTokenStorage} from '../utils/roles.js';

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
            const storage = getTokenStorage(user);
            const targetStorage = storage === 'sessionStorage' ? sessionStorage : localStorage;
            targetStorage.setItem("user", JSON.stringify(user));
        }
        // Убираем автоматический сброс isAuthenticated при отсутствии user
        // Это должно управляться только в App.jsx
    }, [user, refresh]);

    // Мемоизация контекста для предотвращения лишних ререндеров
    const value = useMemo(() => ({
        user, 
        setUser, 
        checkTokenExpiration, 
        isAuthenticated, 
        setIsAuthenticated, 
        saveToken
    }), [user, setUser, checkTokenExpiration, isAuthenticated, setIsAuthenticated, saveToken]);
    
    return (
        <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
    );
}

export default BaseContex;