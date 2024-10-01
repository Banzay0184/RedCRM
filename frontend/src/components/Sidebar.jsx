import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
    List,
    Card,
    Avatar,
    ListItem,
    Accordion,
    Typography,
    AccordionBody,
    ListItemPrefix,
    IconButton,
} from "@material-tailwind/react";
import {
    UserGroupIcon,
    CalendarIcon,
} from "@heroicons/react/24/solid";
import {
    ServerIcon,
    ArrowLeftStartOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

function SidebarLight() {
    const [open, setOpen] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [time, setTime] = useState(new Date());
    const navigate = useNavigate();

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleOpen = (value) => {
        setOpen(open === value ? 0 : value);
    };

    const handleSignOut = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/"); // Redirect to login
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const LIST_ITEM_STYLES =
        "select-none hover:bg-gray-100 focus:bg-gray-100 active:bg-gray-100 hover:text-gray-900 focus:text-gray-900 active:text-gray-900 data-[selected=true]:text-gray-900";

    return (
        <div className="relative">
            {/* Hamburger Icon to toggle sidebar on mobile */}
            <IconButton
                className="block md:hidden fixed top-4 left-4 z-50"
                onClick={toggleSidebar}
            >
                {isSidebarOpen ? <XMarkIcon className="h-6 w-6"/> : <Bars3Icon className="h-6 w-6"/>}
            </IconButton>

            {/* Sidebar */}
            <Card
                className={`fixed h-full w-64 max-w-xs p-6 shadow-md transition-transform transform flex flex-col ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                } md:translate-x-0 md:block z-40 bg-white`}
            >
                <div className="flex-grow">
                    <div className="text-center">
                        <Typography variant="h4" className="text-gray-700">
                            {time.toLocaleTimeString("ru-RU")}
                        </Typography>
                    </div>
                    <div className="mb-2 mt-4 flex items-center justify-center gap-4 cursor-pointer"
                         onClick={() => {
                             navigate("/dashboard");
                             toggleSidebar();
                         }}>
                        <Typography color="blue-gray" className="text-3xl font-bold">
                            <span className="text-red-500">RED</span>CRM
                        </Typography>
                    </div>
                    <hr className="my-2 border-gray-200"/>
                    <List>
                        <Accordion open={open === 1}>
                            <AccordionBody className="py-1">
                                <List className="p-0">
                                    <ListItem className={`px-16 ${LIST_ITEM_STYLES}`}>
                                        Профиль
                                    </ListItem>
                                    <ListItem className={`px-16 ${LIST_ITEM_STYLES}`}>
                                        Настройки
                                    </ListItem>
                                </List>
                            </AccordionBody>
                        </Accordion>
                        <hr className="my-2 border-gray-200"/>
                        <ListItem
                            className={LIST_ITEM_STYLES}
                            onClick={() => {
                                navigate("/clients");
                                toggleSidebar();
                            }}
                        >
                            <ListItemPrefix>
                                <UserGroupIcon className="h-5 w-5"/>
                            </ListItemPrefix>
                            Клиенты
                        </ListItem>
                        <ListItem
                            className={LIST_ITEM_STYLES}
                            onClick={() => {
                                navigate("/orders");
                                toggleSidebar();
                            }}
                        >
                            <ListItemPrefix>
                                <CalendarIcon className="h-5 w-5"/>
                            </ListItemPrefix>
                            Заказы
                        </ListItem>
                        <ListItem className={LIST_ITEM_STYLES} onClick={() => {
                            navigate("/orders");
                            toggleSidebar();
                        }}>
                            <ListItemPrefix>
                                <ServerIcon className="h-5 w-5"/>
                            </ListItemPrefix>
                            Настройки
                        </ListItem>
                        <ListItem className={LIST_ITEM_STYLES} onClick={handleSignOut}>
                            <ListItemPrefix>
                                <ArrowLeftStartOnRectangleIcon className="h-5 w-5"/>
                            </ListItemPrefix>
                            Выйти
                        </ListItem>
                    </List>
                </div>

            </Card>
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black opacity-50 md:hidden z-30"
                    onClick={toggleSidebar}
                ></div>
            )}
        </div>
    );
}

export default SidebarLight;
