// components/StatCard.jsx
import React from 'react';

function StatCard({ title, value, icon: Icon }) {
    return (
        <div className="stat bg-base-200 p-4 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="stat-title text-lg font-semibold flex items-center">
                {Icon && <Icon className="mr-2" size={24} />}
                {title}
            </div>
            <div className="stat-value text-2xl font-bold mt-2">{value}</div>
        </div>
    );
}

export default StatCard;
