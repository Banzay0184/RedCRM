import React from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

export function SortableItem({ id, worker, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="sortable-item bg-white p-2 rounded-xl shadow-lg flex items-center justify-between touch-manipulation"
      data-draggable="true"
    >
      <div 
        {...listeners}
        className="flex flex-col drag-handle flex-grow"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-gray-800">{worker.name}</span>
          <span className="drag-indicator text-gray-400 text-sm select-none">⋮⋮</span>
        </div>
        <span className="text-gray-600">{worker.phone_number}</span>
      </div>
      <div className="flex space-x-2">
        {/* Кнопки перемещения - всегда видимы для работников */}
        <div className="flex flex-col space-y-1">
          <button
            className={`move-button w-8 h-8 flex items-center justify-center rounded-full text-gray-500 touch-manipulation ${
              !canMoveUp 
                ? 'opacity-30 cursor-not-allowed bg-gray-100' 
                : 'hover:text-white hover:bg-blue-500 hover:shadow-md active:scale-95'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (canMoveUp) onMoveUp();
            }}
            disabled={!canMoveUp}
            title="Переместить вверх"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            className={`move-button w-8 h-8 flex items-center justify-center rounded-full text-gray-500 touch-manipulation ${
              !canMoveDown 
                ? 'opacity-30 cursor-not-allowed bg-gray-100' 
                : 'hover:text-white hover:bg-blue-500 hover:shadow-md active:scale-95'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (canMoveDown) onMoveDown();
            }}
            disabled={!canMoveDown}
            title="Переместить вниз"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        <button
          className="text-blue-500 font-semibold hover:text-blue-700 transition duration-150 touch-manipulation"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          ✏️
        </button>
        <button
          className="text-red-500 font-semibold hover:text-red-700 transition duration-150 touch-manipulation"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
