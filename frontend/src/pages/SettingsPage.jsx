import React from 'react';
import ServicesList from '../components/ServicesList';
import WorkersList from '../components/WorkersList';

function SettingsPage() {
  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-center">Настройки</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-2xl font-semibold mb-4">Услуги</h3>
          <ServicesList />
        </div>
        <div>
          <h3 className="text-2xl font-semibold mb-4">Работники</h3>
          <WorkersList />
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
