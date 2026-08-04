import React, {useEffect, useState} from 'react';
import {closestCenter, DndContext, PointerSensor, TouchSensor, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {createService, deleteService, getServices, updateService, updateServicesOrder} from '../api';
import {toast} from 'react-hot-toast';

// Визуал карточки услуги с поддержкой drag & drop и стрелок
function SortableServiceItem({
    id,
    service,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="sortable-item bg-white p-2 rounded-xl shadow-lg flex items-center justify-between touch-manipulation"
            data-draggable="true"
        >
            <div
                {...listeners}
                className="flex flex-col drag-handle flex-grow"
            >
                <div className="flex items-center space-x-2">
                    <span
                        className="inline-block w-4 h-4 rounded-full border"
                        style={{backgroundColor: service.color}}
                    />
                    <span className="text-lg font-semibold text-gray-800">{service.name}</span>
                    <span className="drag-indicator text-gray-400 text-sm select-none">⋮⋮</span>
                </div>
                <span className="text-gray-600 text-sm">
                    Камера активна: {service.is_active_camera ? 'Да' : 'Нет'}
                </span>
            </div>
            <div className="flex space-x-2 items-center">
                <div className="flex flex-col space-y-1">
                    <button
                        className={`move-button w-8 h-8 flex items-center justify-center rounded-full text-gray-500 touch-manipulation ${
                            !canMoveUp
                                ? 'opacity-30 cursor-not-allowed bg-gray-100'
                                : 'hover:text-white hover:bg-blue-500 hover:shadow-md active:scale-95'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (canMoveUp) onMoveUp();
                        }}
                        disabled={!canMoveUp}
                        title="Переместить вверх"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button
                        className={`move-button w-8 h-8 flex items-center justify-center rounded-full text-gray-500 touch-manipulation ${
                            !canMoveDown
                                ? 'opacity-30 cursor-not-allowed bg-gray-100'
                                : 'hover:text-white hover:bg-blue-500 hover:shadow-md active:scale-95'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (canMoveDown) onMoveDown();
                        }}
                        disabled={!canMoveDown}
                        title="Переместить вниз"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                <button
                    className="text-blue-500 font-semibold hover:text-blue-700 transition duration-150 touch-manipulation"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                >
                    ✏️
                </button>
                <button
                    className="text-red-500 font-semibold hover:text-red-700 transition duration-150 touch-manipulation"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                >
                    🗑️
                </button>
            </div>
        </div>
    );
}

function ServicesList() {
    const [services, setServices] = useState([]);
    const [currentService, setCurrentService] = useState("");
    const [isActiveCamera, setIsActiveCamera] = useState(false);
    const [color, setColor] = useState("#FFFFFF");
    const [editingServiceId, setEditingServiceId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {distance: 10},
        }),
        useSensor(TouchSensor, {
            activationConstraint: {delay: 150, tolerance: 8},
        }),
    );

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const response = await getServices();
            const sorted = [...response.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setServices(sorted);
        } catch (error) {
            toast.error('Ошибка загрузки списка услуг');
        }
    };

    const handleSaveService = async () => {
        try {
            const serviceData = {name: currentService, is_active_camera: isActiveCamera, color: color};
            if (editingServiceId) {
                // сохраняем order текущей услуги
                const existing = services.find((s) => s.id === editingServiceId);
                const payload = {...serviceData, order: existing?.order ?? 0};
                await updateService(editingServiceId, payload);
                setServices((prev) => prev.map((s) => (s.id === editingServiceId ? {...s, ...payload} : s)));
                toast.success('Услуга обновлена');
            } else {
                // Используем длину массива как порядок для новой услуги
                const payload = {...serviceData, order: services.length};
                const response = await createService(payload);
                const newServices = [...services, response.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                setServices(newServices);
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

    const persistOrder = async (newServices) => {
        try {
            // Используем специальный endpoint для обновления порядка, как в WorkersList
            await updateServicesOrder(
                newServices.map((service, index) => ({
                    id: service.id,
                    order: index
                }))
            );
            // Перезагружаем данные с сервера после успешного обновления
            await fetchServices();
            toast.success('Порядок услуг обновлен');
        } catch (error) {
            toast.error('Ошибка обновления порядка услуг');
            // Восстанавливаем исходный порядок при ошибке
            fetchServices();
        }
    };

    const handleDragEnd = async (event) => {
        const {active, over} = event;
        document.body.style.cursor = '';

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = services.findIndex((s) => s.id === active.id);
        const newIndex = services.findIndex((s) => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const newServices = arrayMove(services, oldIndex, newIndex);
        setServices(newServices);
        await persistOrder(newServices);
    };

    const handleMoveUp = async (serviceId) => {
        const currentIndex = services.findIndex((s) => s.id === serviceId);
        if (currentIndex > 0) {
            const newServices = arrayMove(services, currentIndex, currentIndex - 1);
            setServices(newServices);
            await persistOrder(newServices);
        }
    };

    const handleMoveDown = async (serviceId) => {
        const currentIndex = services.findIndex((s) => s.id === serviceId);
        if (currentIndex < services.length - 1) {
            const newServices = arrayMove(services, currentIndex, currentIndex + 1);
            setServices(newServices);
            await persistOrder(newServices);
        }
    };

    return (
        <div className="p-2 flex flex-col items-center self-start w-full">
            <h2 className="text-2xl font-semibold mb-3">Управление Услугами</h2>
            <p className="text-sm text-gray-600 mb-4 text-center">
                Перетащите услугу или используйте стрелки ↑↓ для изменения порядка
            </p>

            <button
                className="bg-blue-600 text-white px-4 py-2 rounded-full mb-4 shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
                onClick={() => {
                    resetModal();
                    setIsModalOpen(true);
                }}
            >
                Добавить Услугу
            </button>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                onDragStart={() => { document.body.style.cursor = 'grabbing'; }}
                onDragCancel={() => { document.body.style.cursor = ''; }}
            >
                <SortableContext
                    items={services.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="grid grid-cols-1 gap-6 w-full max-h-[70vh] overflow-y-auto pr-1">
                        {services.map((service, index) => (
                            <SortableServiceItem
                                key={service.id}
                                id={service.id}
                                service={service}
                                onEdit={() => handleEditService(service)}
                                onDelete={() => handleDeleteService(service.id)}
                                onMoveUp={() => handleMoveUp(service.id)}
                                onMoveDown={() => handleMoveDown(service.id)}
                                canMoveUp={index > 0}
                                canMoveDown={index < services.length - 1}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

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
