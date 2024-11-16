import React, {useEffect, useState} from 'react';

export const GlobalContext = React.createContext({});

function BaseContex({children, setUser, user, checkTokenExpiration}) {
    const [refresh, setRefresh] = useState(false)

    useEffect(() => {
        if (!refresh){
            setRefresh(true)
        }
        localStorage.setItem("user", JSON.stringify(user))
    }, [user, refresh]);


    const value = {user, setUser , checkTokenExpiration}
    return (
        <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
    );
}

export default BaseContex;