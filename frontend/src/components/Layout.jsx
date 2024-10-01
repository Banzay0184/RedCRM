import React from "react";
import Sidebar from "./Sidebar.jsx";
import {useApi} from "../api.jsx";
import SessionExpiredModal from "./SendMessageModal.jsx";
import {ToastContainer} from "react-toastify";

const Layout = ({children}) => {
    const {isSessionExpired, handleLogout} = useApi();

    return (
        <div className="flex">
            <div className="w-64">
                <Sidebar/>
            </div>
            <div className="flex-1 p-6">
                <main>{children}</main>
            </div>
            <ToastContainer />
                <SessionExpiredModal isOpen={isSessionExpired} handleLogout={handleLogout}/>
        </div>
    );
};

export default Layout;
