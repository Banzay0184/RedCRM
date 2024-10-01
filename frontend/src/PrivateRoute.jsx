import React from 'react';
import {Navigate, Outlet} from 'react-router-dom';

const PrivateRoute = () => {
    const isAuthenticated = !!localStorage.getItem('access_token'); // Проверка аутентификации
    return isAuthenticated ? <Outlet/> : <Navigate to="/"/>;
};

export default PrivateRoute;
