import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './PrivateRoute';
import './index.css';
import {ThemeProvider} from "@material-tailwind/react";
import Clients from "./pages/Clients.jsx";
import Order from "./pages/Order.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <ThemeProvider>
            <Routes>
                <Route path="/" element={<Login/>}/>
                <Route element={<PrivateRoute/>}>
                    <Route path="/dashboard" element={<Dashboard/>}/>
                    <Route path="/clients" element={<Clients/>}/>
                    <Route path="/orders" element={<Order/>}/>
                </Route>
            </Routes>
        </ThemeProvider>
    </BrowserRouter>
);
