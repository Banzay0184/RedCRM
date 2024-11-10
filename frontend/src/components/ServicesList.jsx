import React, {useState} from 'react';

function ServicesList() {
  const [services, setServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addService = () => {
    if (currentService) {
      setServices([...services, currentService]);
      setCurrentService("");
      setIsModalOpen(false);
    }
  };

  const deleteService = (service) => {
    setServices(services.filter(s => s !== service));
  };

  return (
    <div>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4 hover:bg-blue-600"
        onClick={() => setIsModalOpen(true)}
      >
        Добавить Услугу
      </button>

      <ul className="space-y-2">
        {services.map((service, index) => (
          <li key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
            <span>{service}</span>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={() => deleteService(service)}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-xl font-semibold mb-4">Добавить Услугу</h3>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 mb-4"
              placeholder="Название услуги"
              value={currentService}
              onChange={(e) => setCurrentService(e.target.value)}
            />
            <button
              className="bg-green-500 text-white px-4 py-2 rounded-md mr-2 hover:bg-green-600"
              onClick={addService}
            >
              Сохранить
            </button>
            <button
              className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
              onClick={() => setIsModalOpen(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServicesList;
