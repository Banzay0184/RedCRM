import React from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

export function SortableItem({ id, worker, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-between transition-transform duration-200 hover:scale-105"
    >
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-gray-800">{worker.name}</span>
        <span className="text-gray-600">{worker.phone_number}</span>
      </div>
      <div className="flex space-x-3">
        <button
          className="text-blue-500 font-semibold hover:text-blue-700 transition duration-150"
          onClick={onEdit}
        >
          ✏️
        </button>
        <button
          className="text-red-500 font-semibold hover:text-red-700 transition duration-150"
          onClick={onDelete}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
