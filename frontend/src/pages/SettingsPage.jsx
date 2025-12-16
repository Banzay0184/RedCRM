import React from 'react';
import ServicesList from '../components/ServicesList';
import WorkersList from '../components/WorkersList';
import WorkerNotificationSettings from '../components/WorkerNotificationSettings';
import WorkerNotificationLogs from '../components/WorkerNotificationLogs';

function SettingsPage() {
  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-center">Настройки</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <ServicesList />
          <WorkersList />
      </div>
      <div className="mt-8 space-y-6">
          <WorkerNotificationSettings />
          <WorkerNotificationLogs />
      </div>
    </div>
  );
}

export default SettingsPage;
