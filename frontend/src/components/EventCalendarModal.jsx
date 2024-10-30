import React from 'react';

const EventCalendarModal = ({ onClose, children }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black opacity-50"
        onClick={onClose} // Закрытие при клике на фон
      ></div>

      {/* Модальное окно */}
      <div className="bg-white p-6 rounded-lg shadow-lg z-10 max-w-md w-full">
        {children}
        <button
          onClick={onClose}
          className="mt-4 bg-indigo-500 text-white py-2 px-4 rounded"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
};

export default EventCalendarModal;
