import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvents, getEventById, createEvent, updateEvent, deleteEvent } from '../api';

// Query keys для кэширования
export const eventKeys = {
    all: ['events'],
    lists: () => [...eventKeys.all, 'list'],
    list: (filters, page) => [...eventKeys.lists(), { filters, page }],
    details: () => [...eventKeys.all, 'detail'],
    detail: (id) => [...eventKeys.details(), id],
};

// Хук для получения всех событий с пагинацией
export const useEvents = (page = 1, pageSize = 10, usePagination = true) => {
    return useQuery({
        queryKey: eventKeys.list(null, usePagination ? page : 'all'),
        queryFn: async () => {
            const response = await getEvents(page, pageSize, usePagination);
            const data = response.data;
            
            // Проверяем, есть ли пагинация (Django REST Framework формат)
            if (data.results !== undefined && usePagination) {
                return {
                    data: data.results,
                    pagination: {
                        count: data.count || 0,
                        next: data.next,
                        previous: data.previous,
                        currentPage: page,
                        pageSize: pageSize,
                        totalPages: Math.ceil((data.count || 0) / pageSize),
                    }
                };
            }
            
            // Если пагинации нет, возвращаем все данные
            return {
                data: Array.isArray(data) ? data : (data.results || []),
                pagination: null,
            };
        },
        staleTime: 2 * 60 * 1000, // 2 минуты для списка событий
        keepPreviousData: true, // Сохраняем предыдущие данные при переходе на другую страницу
    });
};

// Хук для получения события по ID
export const useEvent = (eventId) => {
    return useQuery({
        queryKey: eventKeys.detail(eventId),
        queryFn: async () => {
            const response = await getEventById(eventId);
            return response.data;
        },
        enabled: !!eventId, // Запрос выполняется только если есть eventId
    });
};

// Хук для создания события
export const useCreateEvent = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: createEvent,
        onSuccess: (response) => {
            // Инвалидируем кэш списка событий
            queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
            return response.data;
        },
    });
};

// Хук для обновления события
export const useUpdateEvent = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }) => updateEvent(id, data),
        onSuccess: (response, variables) => {
            // Обновляем кэш конкретного события
            queryClient.setQueryData(eventKeys.detail(variables.id), response.data);
            // Инвалидируем список событий
            queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
        },
    });
};

// Хук для удаления события
export const useDeleteEvent = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: deleteEvent,
        onSuccess: (_, eventId) => {
            // Удаляем из кэша
            queryClient.removeQueries({ queryKey: eventKeys.detail(eventId) });
            // Инвалидируем список событий
            queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
        },
    });
};

