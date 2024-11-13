import React, {useEffect, useState} from 'react';
import {createWorker, deleteWorker, getWorkers, updateWorker} from '../api';
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
            setWorkers(response.data);
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
            const workerData = { name: currentName, phone_number: currentPhoneNumber };
            if (editingWorkerId) {
                await updateWorker(editingWorkerId, workerData);
                setWorkers((prev) => prev.map((w) => (w.id === editingWorkerId ? { ...w, ...workerData } : w)));
                toast.success('Работник обновлен');
            } else {
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

    return (
        <div className="p-2 flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-3">Управление Работниками</h2>

            <button
                className="bg-blue-600 text-white px-4 py-2 rounded-full mb-4 shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
                onClick={() => {
                    resetModal();
                    setIsModalOpen(true);
                }}
            >
                Добавить Работника
            </button>

            <div className="grid grid-cols-1 gap-6 w-full">
                {workers.map((worker) => (
                    <div
                        key={worker.id}
                        className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-between transition-transform duration-200 hover:scale-105"
                    >
                        <div className="flex flex-col">
                            <span className="text-lg font-semibold text-gray-800">{worker.name}</span>
                            <span className="text-gray-600">{worker.phone_number}</span>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                className="text-blue-500 font-semibold hover:text-blue-700 transition duration-150"
                                onClick={() => handleEditWorker(worker)}
                            >
                                ✏️
                            </button>
                            <button
                                className="text-red-500 font-semibold hover:text-red-700 transition duration-150"
                                onClick={() => handleDeleteWorker(worker.id)}
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
