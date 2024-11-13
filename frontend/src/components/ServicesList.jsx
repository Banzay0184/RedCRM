import React, {useEffect, useState} from 'react';
import {createService, deleteService, getServices, updateService} from '../api';
import {toast} from 'react-hot-toast';

function ServicesList() {
    const [services, setServices] = useState([]);
    const [currentService, setCurrentService] = useState("");
    const [isActiveCamera, setIsActiveCamera] = useState(false);
    const [color, setColor] = useState("#FFFFFF");
    const [editingServiceId, setEditingServiceId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const response = await getServices();
            setServices(response.data);
        } catch (error) {
            toast.error('Ошибка загрузки списка услуг');
        }
    };

    const handleSaveService = async () => {
        try {
            const serviceData = {name: currentService, is_active_camera: isActiveCamera, color: color};
            if (editingServiceId) {
                await updateService(editingServiceId, serviceData);
                setServices((prev) => prev.map((s) => (s.id === editingServiceId ? {...s, ...serviceData} : s)));
                toast.success('Услуга обновлена');
            } else {
                const response = await createService(serviceData);
                setServices([...services, response.data]);
                toast.success('Услуга добавлена');
            }
            resetModal();
        } catch (error) {
            toast.error('Ошибка сохранения услуги');
        }
    };

    const handleDeleteService = async (serviceId) => {
        try {
            await deleteService(serviceId);
            setServices(services.filter((service) => service.id !== serviceId));
            toast.success('Услуга удалена');
        } catch (error) {
            toast.error('Ошибка удаления услуги');
        }
    };

    const handleEditService = (service) => {
        setCurrentService(service.name);
        setIsActiveCamera(service.is_active_camera);
        setColor(service.color);
        setEditingServiceId(service.id);
        setIsModalOpen(true);
    };

    const resetModal = () => {
        setCurrentService("");
        setIsActiveCamera(false);
        setColor("#FFFFFF");
        setEditingServiceId(null);
        setIsModalOpen(false);
    };

    return (
        <div className="p-2 flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-3">Управление Услугами</h2>

            <button
                className="bg-blue-600 text-white px-4 py-2 rounded-full mb-4 shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
                onClick={() => {
                    resetModal();
                    setIsModalOpen(true);
                }}
            >
                Добавить Услугу
            </button>

            <div className="grid grid-cols-1 gap-6 w-full">
                {services.map((service) => (
                    <div
                        key={service.id}
                        className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-between transition-transform duration-200 hover:scale-105"
                        style={{borderLeft: `5px solid ${service.color}`}}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full" style={{backgroundColor: service.color}}></div>
                            <span className="text-lg font-semibold text-gray-800">{service.name}</span>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                className="text-blue-500 font-semibold hover:text-blue-700 transition duration-150"
                                onClick={() => handleEditService(service)}
                            >
                                ✏️
                            </button>
                            <button
                                className="text-red-500 font-semibold hover:text-red-700 transition duration-150"
                                onClick={() => handleDeleteService(service.id)}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-end z-50 transition-transform transform translate-x-0">
                    <div
                        className="bg-gray-800 rounded-l-lg p-10 w-full max-w-md h-full shadow-xl transition-transform transform translate-x-0">
                        <h3 className="text-2xl font-semibold mb-6 text-center">
                            {editingServiceId ? 'Изменить Услугу' : 'Добавить Услугу'}
                        </h3>

                        <input
                            type="text"
                            className="input mb-8 w-full"
                            placeholder="Название услуги"
                            value={currentService}
                            onChange={(e) => setCurrentService(e.target.value)}
                        />

                        <div className="flex gap-4 mb-8 w-full justify-between items-center">
                            <div className="flex gap-2 items-center">
                                <input
                                    type="checkbox"
                                    checked={isActiveCamera}
                                    onChange={() => setIsActiveCamera(!isActiveCamera)}
                                    className="toggle toggle-primary"
                                />
                                <label className=" font-medium">Активная Камера</label>
                            </div>

                            <div className="flex gap-2 items-center">
                                <label className="block font-medium ">Цвет</label>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className=""
                                />
                            </div>
                        </div>

                        <div className="flex justify-center space-x-4">
                            <button
                                className="bg-green-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-green-700 transition duration-300 transform hover:scale-105"
                                onClick={handleSaveService}
                            >
                                Сохранить
                            </button>
                            <button
                                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg shadow-md hover:bg-gray-400 transition duration-300 transform hover:scale-105"
                                onClick={resetModal}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ServicesList;
