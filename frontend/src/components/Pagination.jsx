import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * Компонент пагинации
 * @param {Object} pagination - Объект с информацией о пагинации
 * @param {number} pagination.currentPage - Текущая страница
 * @param {number} pagination.totalPages - Всего страниц
 * @param {number} pagination.count - Всего элементов
 * @param {Function} onPageChange - Функция для изменения страницы
 */
const Pagination = ({ pagination, onPageChange }) => {
    if (!pagination || pagination.totalPages <= 1) {
        return null;
    }

    const { currentPage, totalPages, count, pageSize } = pagination;
    
    // Вычисляем диапазон отображаемых страниц
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5; // Максимальное количество видимых страниц
        
        if (totalPages <= maxVisible) {
            // Если страниц мало, показываем все
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Показываем первую страницу
            pages.push(1);
            
            // Вычисляем начальную и конечную страницу для отображения
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);
            
            // Если текущая страница близка к началу
            if (currentPage <= 3) {
                end = 4;
            }
            // Если текущая страница близка к концу
            else if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }
            
            // Добавляем многоточие если нужно
            if (start > 2) {
                pages.push('...');
            }
            
            // Добавляем страницы в диапазоне
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            // Добавляем многоточие если нужно
            if (end < totalPages - 1) {
                pages.push('...');
            }
            
            // Показываем последнюю страницу
            pages.push(totalPages);
        }
        
        return pages;
    };

    const pageNumbers = getPageNumbers();
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, count);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            {/* Информация о количестве элементов */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
                Показано {startItem}-{endItem} из {count}
            </div>

            {/* Навигация по страницам */}
            <div className="flex items-center justify-center gap-2">
                {/* Кнопка "Назад" */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-sm btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Предыдущая страница"
                >
                    <FaChevronLeft />
                </button>

                {/* Номера страниц */}
                <div className="flex gap-1 justify-center items-center">
                    {pageNumbers.map((page, index) => {
                        if (page === '...') {
                            return (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="px-3 py-2 text-gray-500"
                                >
                                    ...
                                </span>
                            );
                        }

                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`btn btn-sm ${
                                    page === currentPage
                                        ? 'btn-primary'
                                        : 'btn-outline'
                                }`}
                                aria-label={`Страница ${page}`}
                                aria-current={page === currentPage ? 'page' : undefined}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Кнопка "Вперед" */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn btn-sm btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Следующая страница"
                >
                    <FaChevronRight />
                </button>
            </div>
        </div>
    );
};

export default Pagination;

