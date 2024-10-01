import React, {useEffect, useState} from 'react';
import {
    Button,
    Card,
    Typography,
    Input,
    IconButton,
    Tooltip,
    Checkbox,
    CardBody,
    CardFooter,
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Spinner,
    Select,
    Option
} from '@material-tailwind/react';
import {
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    UserPlusIcon,
    ChatBubbleLeftEllipsisIcon,
    StarIcon
} from '@heroicons/react/24/outline';
import {getClients, createClient, deleteClient, updateClient} from '../api.jsx';
import Layout from '../components/Layout.jsx';
import ClientModal from '../components/ClientModal.jsx';
import SendMessageModal from '../components/SendMessageModal.jsx';
import {toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [openSMSModal, setOpenSMSModal] = useState(false);
    const [massSMSMode, setMassSMSMode] = useState(false);
    const [currentClient, setCurrentClient] = useState(null);
    const [newClient, setNewClient] = useState({name: '', phone_client: [{phone_number: ''}], is_vip: false});
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');  // New filter state
    const [isEditing, setIsEditing] = useState(false);
    const [currentClientId, setCurrentClientId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [clientsPerPage, setClientsPerPage] = useState(5);
    const [showAllClients, setShowAllClients] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);

    useEffect(() => {
        const updateClientsPerPage = () => {
            if (window.innerWidth < 768) {
                setClientsPerPage(3);
            } else if (window.innerWidth < 1024) {
                setClientsPerPage(5);
            } else {
                setClientsPerPage(10);
            }
        };

        window.addEventListener("resize", updateClientsPerPage);
        updateClientsPerPage();

        return () => window.removeEventListener("resize", updateClientsPerPage);
    }, []);

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        // Apply search and filter
        const filtered = clients.filter((client) => {
            const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.phone_client.some((phone) => phone.phone_number.includes(searchQuery));

            // Apply the filter based on VIP status
            const matchesFilter =
                filter === 'vip' ? client.is_vip :
                    filter === 'non-vip' ? !client.is_vip : true;

            return matchesSearch && matchesFilter;
        });

        setFilteredClients(filtered);
    }, [clients, searchQuery, filter]);

    const loadClients = () => {
        setIsLoading(true);
        getClients()
            .then((response) => {
                setClients(response.data);
                setFilteredClients(response.data);
            })
            .catch((error) => {
                toast.error("Ошибка при загрузке клиентов!");
                console.error('Ошибка при получении клиентов:', error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleFilterChange = (value) => {
        setFilter(value);  // Update filter state
    };

    const handleAddClient = () => {
        setIsLoading(true);
        if (isEditing) {
            updateClient(currentClientId, newClient)
                .then(() => {
                    loadClients();
                    setOpenModal(false);
                    setIsEditing(false);
                    toast.success("Клиент успешно обновлен!");
                })
                .catch((error) => {
                    toast.error("Ошибка при обновлении клиента!");
                    console.error('Ошибка при обновлении клиента:', error);
                })
                .finally(() => setIsLoading(false));
        } else {
            createClient(newClient)
                .then(() => {
                    loadClients();
                    setOpenModal(false);
                    toast.success("Клиент успешно добавлен!");
                })
                .catch((error) => {
                    toast.error("Ошибка при добавлении клиента!");
                    console.error('Ошибка при добавлении клиента:', error);
                })
                .finally(() => setIsLoading(false));
        }
    };

    const confirmDeleteClient = (clientId) => {
        setClientToDelete(clientId);
        setIsConfirming(true);
    };

    const handleDeleteConfirmed = () => {
        setIsLoading(true);
        deleteClient(clientToDelete)
            .then(() => {
                loadClients();
                toast.success("Клиент успешно удален!");
            })
            .catch((error) => {
                toast.error("Ошибка при удалении клиента!");
                console.error('Ошибка при удалении клиента:', error);
            })
            .finally(() => {
                setIsConfirming(false);
                setClientToDelete(null);
                setIsLoading(false);
            });
    };

    const handleEditClient = (client) => {
        setIsEditing(true);
        setNewClient(client);
        setCurrentClientId(client.id);
        setOpenModal(true);
    };

    const handleSelectClient = (clientId) => {
        setSelectedClients((prevSelected) =>
            prevSelected.includes(clientId)
                ? prevSelected.filter((id) => id !== clientId)
                : [...prevSelected, clientId]
        );
    };

    const handleToggleVIP = (client) => {
        const updatedClient = {...client, is_vip: !client.is_vip}; // Toggle VIP status
        updateClient(client.id, updatedClient)
            .then(() => {
                loadClients(); // Reload the clients list to reflect changes
                toast.success(`Клиент ${updatedClient.is_vip ? 'теперь VIP!' : 'больше не VIP!'}`);
            })
            .catch((error) => {
                toast.error("Ошибка при изменении статуса VIP!");
                console.error('Ошибка при изменении статуса VIP клиента:', error);
            });
    };

    const handleOpenSMSModal = (client) => {
        setCurrentClient(client);
        setMassSMSMode(false);
        setOpenSMSModal(true);
    };

    const handleOpenMassSMSModal = () => {
        if (selectedClients.length === 0) {
            toast.error('Выберите хотя бы одного клиента для отправки SMS');
            return;
        }
        setMassSMSMode(true);
        setOpenSMSModal(true);
    };

    const handleViewAll = () => {
        setShowAllClients(true);
        setCurrentPage(1);
    };

    const handlePaginatedView = () => {
        setShowAllClients(false);
        setCurrentPage(1);
    };

    const indexOfLastClient = currentPage * clientsPerPage;
    const indexOfFirstClient = indexOfLastClient - clientsPerPage;
    const currentClients = showAllClients ? filteredClients : filteredClients.slice(indexOfFirstClient, indexOfLastClient);
    const totalPages = Math.ceil(filteredClients.length / clientsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage((prevPage) => prevPage + 1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage((prevPage) => prevPage - 1);
    };

    return (
        <Layout>
            <Card className="h-full w-full rounded-none shadow-none">
                <div className="flex justify-between items-center p-6">
                    <Typography variant="h5" color="blue-gray">
                        Список клиентов ({filteredClients.length})
                    </Typography>
                    <div className="flex gap-2">
                        <Button variant="outlined" size="sm"
                                onClick={showAllClients ? handlePaginatedView : handleViewAll}>
                            {showAllClients ? 'Показать с пагинацией' : 'Посмотреть всех'}
                        </Button>
                        <Button variant="outlined" className="flex items-center gap-3" size="sm"
                                onClick={handleOpenMassSMSModal}>
                            Отправить массовое SMS {selectedClients.length > 0 && `(${selectedClients.length})`}
                        </Button>
                        <Button className="flex items-center gap-3" size="sm" onClick={() => setOpenModal(true)}>
                            <UserPlusIcon strokeWidth={2} className="h-4 w-4"/> Добавить клиента
                        </Button>

                    </div>
                </div>

                {/* Filter section */}
                <div className="p-6 flex justify-between gap-4 items-center">
                    <Input
                        label="Поиск"
                        value={searchQuery}
                        onChange={handleSearch}
                        icon={<MagnifyingGlassIcon className="h-5 w-5"/>}
                        className="w-1/3"
                    />
                    <Select
                        label="Фильтр"
                        value={filter}
                        onChange={(value) => handleFilterChange(value)}
                        className=""
                    >
                        <Option value="all">Все</Option>
                        <Option value="vip">VIP</Option>
                        <Option value="non-vip">Не VIP</Option>
                    </Select>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spinner className="h-12 w-12"/>
                    </div>
                ) : (
                    <CardBody className="overflow-y-auto">
                        <table className="min-w-full table-auto text-left">
                            <thead>
                            <tr>
                                <th className="p-4">
                                    <Typography variant="small" className="font-normal">
                                        Выбрать
                                    </Typography>
                                </th>
                                <th className="p-4">
                                    <Typography variant="small" className="font-normal">
                                        Клиент
                                    </Typography>
                                </th>
                                <th className="p-4">
                                    <Typography variant="small" className="font-normal">
                                        Телефон
                                    </Typography>
                                </th>
                                <th className="p-4 text-right">
                                    <Typography variant="small" className="font-normal">
                                        Действия
                                    </Typography>
                                </th>
                            </tr>
                            </thead>
                            <tbody>
                            {currentClients.map((client) => (
                                <tr key={client.id} className={client.is_vip ? 'bg-yellow-50' : ''}>
                                    <td className="p-4">
                                        <Checkbox
                                            checked={selectedClients.includes(client.id)}
                                            onChange={() => handleSelectClient(client.id)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <Typography variant="small" className="font-normal">
                                            {client.name}
                                        </Typography>
                                    </td>
                                    <td className="p-4">
                                        <Typography variant="small" className="font-normal opacity-70">
                                            {client.phone_client.map((phone, idx) => (
                                                <span key={idx} className="block">
                                                    {phone.phone_number}
                                                </span>
                                            ))}
                                        </Typography>
                                    </td>
                                    <td className="p-4 text-right">
                                        <Tooltip content="Изменить">
                                            <IconButton variant="text" color="blue"
                                                        onClick={() => handleEditClient(client)}>
                                                <PencilIcon className="h-4 w-4"/>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip content="Удалить">
                                            <IconButton variant="text" color="red"
                                                        onClick={() => confirmDeleteClient(client.id)}>
                                                <TrashIcon className="h-4 w-4"/>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip content="VIP">
                                            <IconButton
                                                variant="text"
                                                color={client.is_vip ? 'yellow' : 'gray'}
                                                className="ml-2"
                                                onClick={() => handleToggleVIP(client)}
                                            >
                                                {client.is_vip ? (
                                                    <StarIcon className="h-5 w-5 text-yellow-500"/>
                                                ) : (
                                                    <StarIcon className="h-5 w-5 text-gray-400"/>
                                                )}
                                            </IconButton>
                                        </Tooltip>

                                        <Tooltip content="Отправить SMS">
                                            <IconButton
                                                variant="text"
                                                color="green"
                                                className="ml-2"
                                                onClick={() => handleOpenSMSModal(client)}
                                            >
                                                <ChatBubbleLeftEllipsisIcon className="h-5 w-5"/>
                                            </IconButton>
                                        </Tooltip>

                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </CardBody>
                )}

                {!showAllClients && (
                    <CardFooter
                        className="sticky bottom-0 left-0 w-full bg-white flex items-center justify-between p-4">
                        <Typography variant="small" color="blue-gray">
                            Страница {currentPage} из {totalPages}
                        </Typography>
                        <div className="flex gap-2">
                            <Button variant="outlined" size="sm" onClick={handlePreviousPage}
                                    disabled={currentPage === 1}>
                                Назад
                            </Button>
                            <Button variant="outlined" size="sm" onClick={handleNextPage}
                                    disabled={currentPage === totalPages}>
                                Вперед
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>

            <ClientModal
                openModal={openModal}
                setOpenModal={setOpenModal}
                handleAddClient={handleAddClient}
                newClient={newClient}
                setNewClient={setNewClient}
            />

            <SendMessageModal
                open={openSMSModal}  // Здесь передаем состояние открытия модального окна
                setOpen={setOpenSMSModal}
                client={massSMSMode ? null : currentClient}
                isMassSMS={massSMSMode}
                selectedClients={massSMSMode ? clients.filter(client => selectedClients.includes(client.id)) : []}
                setSelectedClients={setSelectedClients}
            />


            <Dialog open={isConfirming} handler={() => setIsConfirming(false)}>
                <DialogHeader>Подтверждение удаления</DialogHeader>
                <DialogBody>
                    <Typography>Вы действительно хотите удалить клиента?</Typography>
                </DialogBody>
                <DialogFooter>
                    <Button variant="text" onClick={() => setIsConfirming(false)}>Отмена</Button>
                    <Button color="red" onClick={handleDeleteConfirmed}>Удалить</Button>
                </DialogFooter>
            </Dialog>
        </Layout>
    );
};

export default Clients;
