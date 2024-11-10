import React, {useState} from 'react';

function WorkersList() {
  const [workers, setWorkers] = useState([]);
  const [currentWorker, setCurrentWorker] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addWorker = () => {
    if (currentWorker) {
      setWorkers([...workers, currentWorker]);
      setCurrentWorker("");
      setIsModalOpen(false);
    }
  };

  const deleteWorker = (worker) => {
    setWorkers(workers.filter(w => w !== worker));
  };

  return (
    <div>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4 hover:bg-blue-600"
        onClick={() => setIsModalOpen(true)}
      >
        Добавить Работника
      </button>

      <ul className="space-y-2">
        {workers.map((worker, index) => (
          <li key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
            <span>{worker}</span>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={() => deleteWorker(worker)}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-xl font-semibold mb-4">Добавить Работника</h3>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 mb-4"
              placeholder="Имя работника"
              value={currentWorker}
              onChange={(e) => setCurrentWorker(e.target.value)}
            />
            <button
              className="bg-green-500 text-white px-4 py-2 rounded-md mr-2 hover:bg-green-600"
              onClick={addWorker}
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

export default WorkersList;