import { FaEdit, FaTrash, FaSms } from 'react-icons/fa';

function ClientItem({
    client,
    index,
    selectedClients,
    handleCheckboxChange,
    handleEditClient,
    handleDeleteClient,
    handleSMS,
}) {
    const phoneNumbers = client.phones.map((phone) => phone.phone_number).join(', ');

    return (
        <li
            className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-lg 
            ${selectedClients.includes(client.id) ? 'bg-yellow-100' : 'bg-base-200'}
            ${client.is_vip ? 'border-l-4 border-yellow-500' : ''}`}
        >
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
                <input
                    type="checkbox"
                    className="checkbox"
                    onChange={() => handleCheckboxChange(client.id)}
                    checked={selectedClients.includes(client.id)}
                />
                <div>
                    <p className="text-sm text-gray-500">
                        {client.name}
                    </p>
                    <a
                        href={`tel:${client.phones[0]?.phone_number || ''}`}
                        className="text-sm text-gray-500 hover:underline underline-offset-2 font-semibold cursor-pointer"
                    >
                        {phoneNumbers}
                    </a>
                    {client.is_vip && (
                        <p className="text-sm text-yellow-600 font-semibold">VIP клиент</p>
                    )}
                </div>
            </div>

            <div className="flex items-center mt-2 md:mt-0 space-x-4">
                <FaEdit
                    className="text-blue-500 cursor-pointer"
                    onClick={() => handleEditClient(client)}
                    title="Изменить"
                />
                <FaSms
                    className="text-yellow-500 cursor-pointer"
                    onClick={() => handleSMS(client)}
                    title="Отправить SMS"
                />
                <FaTrash
                    className="text-red-500 cursor-pointer"
                    onClick={() => handleDeleteClient(client)}
                    title="Удалить"
                />
            </div>
        </li>
    );
}

export default ClientItem;
