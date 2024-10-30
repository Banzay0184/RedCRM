// EventDetailModal.js
import React from 'react';
import {format} from 'date-fns';
import {ru} from 'date-fns/locale';

const EventDetailModal = ({ event, services, workersMap, onClose }) => {
  return (
    <div className="modal modal-open flex items-center justify-center z-50">
      <div className="modal-box relative max-w-3xl p-8 rounded-xl shadow-2xl border-t-8 border-indigo-500">
        <button
          className="btn btn-sm btn-circle absolute right-3 top-3 bg-red-500 text-white hover:bg-red-600"
          onClick={onClose}
        >
          ✕
        </button>

        <h3 className="text-3xl font-bold mb-8 text-center">Детали события</h3>

        <div className="space-y-6">
          <section className="border-b pb-4">
            <h4 className="text-xl font-semibold">Клиент</h4>
            <p className="text-lg ml-4">{event.client.name}</p>
            <div className="mt-2">
              <p className="font-semibold">Телефоны:</p>
              <ul className="ml-4">
                {event.client.phones.map((phone) => (
                    <li key={phone.id}>+{phone.phone_number}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="border-b pb-4">
            <h4 className="text-xl font-semibold ">Детали заказа</h4>
            <div className="ml-4 space-y-1 ">
              <p><strong>Ресторан:</strong> {event.restaurant_name}</p>
              <p><strong>Комментарий:</strong> {event.comment}</p>
              <p><strong>Сумма:</strong> {event.amount}</p>
              <p><strong>Аванс:</strong> {event.advance}</p>
            </div>
          </section>
          <section>
            <h4 className="text-xl font-semibold">Работники</h4>
            {event.workers && event.workers.length > 0 ? (
                <ul className="ml-4 mt-2">
                  {event.workers.map((workerId) => (
                      <li key={workerId}>
                        {workersMap[workerId] || 'Имя работника не найдено'}
                      </li>
                  ))}
                </ul>
            ) : (
                <p className="ml-4 text-gray-600 mt-2">Нет информации о работниках.</p>
            )}
          </section>
          <section className=" pb-4">
            <h4 className="text-xl font-semibold ">Устройства и услуги</h4>
            {event.devices.map((device) => (
                <div key={device.id} className="p-4 mt-4 rounded-lg  border border-indigo-200">
                  <p><strong>Услуга:</strong> {services[device.service] || 'Услуга не найдена'}</p>
                  <p><strong>Количество камер:</strong> {device.camera_count}</p>
                  <p><strong>Дата услуги:</strong> {device.event_service_date
                      ? format(new Date(device.event_service_date), 'dd.MM.yyyy', {locale: ru})
                      : 'Дата не указана'}</p>
                  <p><strong>Комментарий:</strong> {device.comment}</p>
                </div>
            ))}
          </section>

          <section className=" pb-4">
            <h4 className="text-xl font-semibold">Временные метки</h4>
            <div className="ml-4 space-y-1">
              <p><strong>Дата создания:</strong> {format(new Date(event.created_at), 'dd.MM.yyyy HH:mm', {locale: ru})}
              </p>
              <p><strong>Обновлено:</strong> {format(new Date(event.updated_at), 'dd.MM.yyyy HH:mm', {locale: ru})}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
