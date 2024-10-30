import { useState, useEffect } from 'react';
import ClientItem from '../components/ClientItem';
import EditClientModal from '../components/EditClientModal';
import AddClientModal from '../components/AddClientModal';
import SendSMSModal from '../components/SendSMSModal';
import BulkSMSModal from '../components/BulkSMSModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { getClients, deleteClient } from '../api.js';

function ClientsPage() {
    const [clients, setClients] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterVIP, setFilterVIP] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Состояния модальных окон
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
    const [isBulkSMSModalOpen, setIsBulkSMSModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

    const [currentClient, setCurrentClient] = useState(null);

    // Получение списка клиентов при монтировании компонента
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await getClients();
                setClients(response.data);
            } catch (error) {
                console.error('Ошибка при получении списка клиентов:', error);
                setErrorMessage('Не удалось загрузить список клиентов. Пожалуйста, попробуйте позже.');
            }
        };

        fetchClients();
    }, []);

    // Автоматическое скрытие сообщений об успехе
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleCheckboxChange = (clientId) => {
        setSelectedClients((prevSelected) => {
            if (prevSelected.includes(clientId)) {
                return prevSelected.filter((id) => id !== clientId);
            } else {
                return [...prevSelected, clientId];
            }
        });
    };

    const handleBulkSMS = () => {
        setIsBulkSMSModalOpen(true);
    };

    const handleDeleteClient = (client) => {
        setCurrentClient(client);
        setIsConfirmDeleteOpen(true);
    };

    const confirmDeleteClient = async () => {
        try {
            await deleteClient(currentClient.id);
            setClients(clients.filter((client) => client.id !== currentClient.id));
            setSuccessMessage('Клиент успешно удален.');
        } catch (error) {
            console.error('Ошибка при удалении клиента:', error);
            setErrorMessage('Не удалось удалить клиента. Пожалуйста, попробуйте снова.');
        } finally {
            setIsConfirmDeleteOpen(false);
            setCurrentClient(null);
        }
    };

    const handleEditClient = (client) => {
        setCurrentClient(client);
        setIsEditModalOpen(true);
    };

    const handleAddClient = () => {
        setIsAddModalOpen(true);
    };

    const handleSMS = (client) => {
        setCurrentClient(client);
        setIsSMSModalOpen(true);
    };

    const filteredClients = clients.filter((client) => {
        const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesVIP = filterVIP ? client.is_vip : true;
        return matchesSearch && matchesVIP;
    });

    return (
        <div className="p-4 md:p-6">
            {/* Сообщения об ошибке и успехе */}
            {errorMessage && (
                <div className="alert alert-error shadow-lg mb-4">
                    <div>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="stroke-current flex-shrink-0 h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728"
                            />
                        </svg>
                        <span>{errorMessage}</span>
                    </div>
                </div>
            )}
            {successMessage && (
                <div className="alert alert-success w-full md:w-[25%] shadow-lg mb-4 absolute top-5 right-5">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="stroke-white flex-shrink-0 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    <span className='text-white'>{successMessage}</span>
                </div>
            )}

            {/* Поисковая строка и фильтры */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-4 md:space-y-0">
                <input
                    type="text"
                    placeholder="Поиск клиентов..."
                    className="input input-bordered w-full md:w-1/2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                    {selectedClients.length === 0 && (
                        <div className="flex flex-row space-x-4">
                            <button
                                className={`btn md:w-auto ${filterVIP ? 'btn-primary text-white' : 'btn-outline'}`}
                                onClick={() => setFilterVIP(!filterVIP)}
                            >
                                {filterVIP ? 'Только VIP' : 'Все клиенты'}
                            </button>
                            <button
                                className="btn btn-success text-white md:w-auto"
                                onClick={handleAddClient}
                            >
                                Добавить клиента
                            </button>
                        </div>
                    )}
                    {selectedClients.length > 0 && (
                        <div className="flex flex-row space-x-4">
                            <button
                                disabled={true}
                                className="btn btn-success text-white md:w-auto"
                                onClick={handleBulkSMS}
                            >
                                Отправить SMS
                                <p>( {selectedClients.length} )</p>

                            </button>
                            <button
                                className="btn btn-error md:w-auto"
                                onClick={() => setSelectedClients([])}
                            >
                                Очистить выбор
                            </button>
                        </div>
                    )}
            </div>

            {/* Список клиентов */}
            <ul className="space-y-4">
                {filteredClients.map((client, index) => (
                    <ClientItem
                        key={client.id}
                        client={client}
                        index={index}
                        selectedClients={selectedClients}
                        handleCheckboxChange={handleCheckboxChange}
                        handleEditClient={handleEditClient}
                        handleDeleteClient={handleDeleteClient}
                        handleSMS={handleSMS}
                    />
                ))}
            </ul>

            {/* Модальные окна */}
            {isEditModalOpen && (
                <EditClientModal
                    client={currentClient}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setCurrentClient(null);
                    }}
                    onSave={(updatedClient) => {
                        setClients(
                            clients.map((client) =>
                                client.id === updatedClient.id ? updatedClient : client
                            )
                        );
                        setIsEditModalOpen(false);
                        setCurrentClient(null);
                        setSuccessMessage('Данные клиента обновлены.');
                    }}
                />
            )}

            {isAddModalOpen && (
                <AddClientModal
                    onClose={() => {
                        setIsAddModalOpen(false);
                    }}
                    onSave={(newClient) => {
                        setClients([...clients, newClient]);
                        setIsAddModalOpen(false);
                        setSuccessMessage('Новый клиент добавлен.');
                    }}
                />
            )}

            {isSMSModalOpen && (
                <SendSMSModal
                    client={currentClient}
                    onClose={() => {
                        setIsSMSModalOpen(false);
                        setCurrentClient(null);
                    }}
                />
            )}

            {isBulkSMSModalOpen && (
                <BulkSMSModal
                    clients={clients.filter((client) => selectedClients.includes(client.id))}
                    onClose={() => setIsBulkSMSModalOpen(false)}
                />
            )}

            {isConfirmDeleteOpen && (
                <ConfirmDeleteModal
                    onConfirm={confirmDeleteClient}
                    onCancel={() => {
                        setIsConfirmDeleteOpen(false);
                        setCurrentClient(null);
                    }}
                />
            )}
        </div>
    );
}

export default ClientsPage;
