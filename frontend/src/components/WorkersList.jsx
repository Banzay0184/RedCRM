import React, {useEffect, useState} from 'react';
import {closestCenter, DndContext, PointerSensor, TouchSensor, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {SortableItem} from './SortableItem'; // Создадим этот компонент ниже
import {createWorker, deleteWorker, getWorkers, updateWorker, updateWorkersOrder} from '../api';
import {toast} from 'react-hot-toast';

function WorkersList() {
    const [workers, setWorkers] = useState([]);
    const [currentName, setCurrentName] = useState("");
    const [currentPhoneNumber, setCurrentPhoneNumber] = useState("");
    const [editingWorkerId, setEditingWorkerId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        try {
            const response = await getWorkers();
            // Сортируем работников по полю 'order'
            const sortedWorkers = response.data.sort((a, b) => a.order - b.order);
            setWorkers(sortedWorkers);
        } catch (error) {
            toast.error('Ошибка загрузки списка работников');
        }
    };

    const handleSaveWorker = async () => {
        // Проверяем формат номера телефона
        const phoneRegex = /^\+998\d{9}$/;
        if (!phoneRegex.test(currentPhoneNumber)) {
            toast.error('Номер телефона должен быть в формате +998XXXXXXXXX');
            return;
        }

        try {
            const workerData = {name: currentName, phone_number: currentPhoneNumber};

            if (editingWorkerId) {
                await updateWorker(editingWorkerId, workerData);
                setWorkers((prev) =>
                    prev.map((w) => (w.id === editingWorkerId ? {...w, ...workerData} : w))
                );
                toast.success('Работник обновлен');
            } else {
                // Определяем максимальный order
                const maxOrder = workers.length > 0 ? Math.max(...workers.map(w => w.order)) : 0;
                workerData.order = maxOrder + 1;

                const response = await createWorker(workerData);
                setWorkers([...workers, response.data]);
                toast.success('Работник добавлен');
            }
            resetModal();
        } catch (error) {
            toast.error('Ошибка сохранения работника');
        }
    };

    const handleDeleteWorker = async (workerId) => {
        try {
            await deleteWorker(workerId);
            setWorkers(workers.filter((worker) => worker.id !== workerId));
            toast.success('Работник удален');
        } catch (error) {
            toast.error('Ошибка удаления работника');
        }
    };

    const handleEditWorker = (worker) => {
        setCurrentName(worker.name);
        setCurrentPhoneNumber(worker.phone_number);
        setEditingWorkerId(worker.id);
        setIsModalOpen(true);
    };

    const resetModal = () => {
        setCurrentName("");
        setCurrentPhoneNumber("");
        setEditingWorkerId(null);
        setIsModalOpen(false);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 8,
            },
        })
    );

    const handleDragEnd = async (event) => {
        const {active, over} = event;
        
        // Сбрасываем курсор
        document.body.style.cursor = '';

        // Проверяем, что over не null и active.id !== over.id
        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = workers.findIndex(worker => worker.id === active.id);
        const newIndex = workers.findIndex(worker => worker.id === over.id);

        // Проверяем, что индексы найдены
        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const newWorkers = arrayMove(workers, oldIndex, newIndex);

        setWorkers(newWorkers);

        // Обновляем порядок на бэкенде
        try {
            await updateWorkersOrder(newWorkers.map((worker, index) => ({
                id: worker.id,
                order: index
            })));
            toast.success('Порядок работников обновлен');
        } catch (error) {
            toast.error('Ошибка обновления порядка работников');
            // Восстанавливаем исходный порядок при ошибке
            fetchWorkers();
        }
    };

    // Альтернативный способ переупорядочивания для мобильных устройств
    const handleMoveUp = async (workerId) => {
        const currentIndex = workers.findIndex(worker => worker.id === workerId);
        if (currentIndex > 0) {
            const newWorkers = arrayMove(workers, currentIndex, currentIndex - 1);
            setWorkers(newWorkers);
            
            try {
                await updateWorkersOrder(newWorkers.map((worker, index) => ({
                    id: worker.id,
                    order: index
                })));
                toast.success('Работник перемещен вверх');
            } catch (error) {
                toast.error('Ошибка обновления порядка работников');
                fetchWorkers();
            }
        }
    };

    const handleMoveDown = async (workerId) => {
        const currentIndex = workers.findIndex(worker => worker.id === workerId);
        if (currentIndex < workers.length - 1) {
            const newWorkers = arrayMove(workers, currentIndex, currentIndex + 1);
            setWorkers(newWorkers);
            
            try {
                await updateWorkersOrder(newWorkers.map((worker, index) => ({
                    id: worker.id,
                    order: index
                })));
                toast.success('Работник перемещен вниз');
            } catch (error) {
                toast.error('Ошибка обновления порядка работников');
                fetchWorkers();
            }
        }
    };

    return (
        <div className="p-2 flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-3">Управление Работниками</h2>
            <p className="text-sm text-gray-600 mb-4 text-center">
                Перетащите работника или используйте стрелки ↑↓ для изменения порядка
            </p>

            <button
                className="bg-blue-600 text-white px-4 py-2 rounded-full mb-4 shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
                onClick={() => {
                    resetModal();
                    setIsModalOpen(true);
                }}
            >
                Добавить Работника
            </button>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                onDragStart={() => {
                    // Добавляем небольшую задержку для плавности
                    document.body.style.cursor = 'grabbing';
                }}
                onDragCancel={() => {
                    document.body.style.cursor = '';
                }}
            >
                <SortableContext
                    items={workers.map(worker => worker.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="grid grid-cols-1 gap-6 w-full">
                        {workers.map((worker, index) => (
                            <SortableItem
                                key={worker.id}
                                id={worker.id}
                                worker={worker}
                                onEdit={() => handleEditWorker(worker)}
                                onDelete={() => handleDeleteWorker(worker.id)}
                                onMoveUp={() => handleMoveUp(worker.id)}
                                onMoveDown={() => handleMoveDown(worker.id)}
                                canMoveUp={index > 0}
                                canMoveDown={index < workers.length - 1}
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
                            {editingWorkerId ? 'Изменить Работника' : 'Добавить Работника'}
                        </h3>

                        <input
                            type="text"
                            className="input mb-4 w-full"
                            placeholder="Имя работника"
                            value={currentName}
                            onChange={(e) => setCurrentName(e.target.value)}
                        />

                        <input
                            type="text"
                            className="input mb-8 w-full"
                            placeholder="Номер телефона (+998XXXXXXXXX)"
                            value={currentPhoneNumber}
                            onChange={(e) => {
                                // Ограничение ввода на 15 символов и только цифры после +998
                                const value = e.target.value.replace(/\D/g, '');
                                setCurrentPhoneNumber(`+998${value.slice(3, 12)}`);
                            }}
                            maxLength={13}
                        />

                        <div className="flex justify-center space-x-4">
                            <button
                                className="bg-green-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-green-700 transition duration-300 transform hover:scale-105"
                                onClick={handleSaveWorker}
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

export default WorkersList;
