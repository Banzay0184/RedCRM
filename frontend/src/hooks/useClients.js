import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, createClient, updateClient, deleteClient } from '../api';

// Query keys для кэширования
export const clientKeys = {
    all: ['clients'],
    lists: () => [...clientKeys.all, 'list'],
    list: (page) => [...clientKeys.lists(), { page }],
    details: () => [...clientKeys.all, 'detail'],
    detail: (id) => [...clientKeys.details(), id],
};

// Хук для получения всех клиентов с пагинацией
export const useClients = (page = 1, pageSize = 10) => {
    return useQuery({
        queryKey: clientKeys.list(page),
        queryFn: async () => {
            const response = await getClients(page, pageSize);
            const data = response.data;
            
            // Проверяем, есть ли пагинация (Django REST Framework формат)
            if (data.results !== undefined) {
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
            
            // Если пагинации нет, возвращаем данные как есть
            return {
                data: Array.isArray(data) ? data : [],
                pagination: null,
            };
        },
        staleTime: 5 * 60 * 1000, // 5 минут для списка клиентов
        keepPreviousData: true,
    });
};

// Хук для создания клиента
export const useCreateClient = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: createClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

// Хук для обновления клиента
export const useUpdateClient = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }) => updateClient(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

// Хук для удаления клиента
export const useDeleteClient = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: deleteClient,
        onSuccess: (_, clientId) => {
            queryClient.removeQueries({ queryKey: clientKeys.detail(clientId) });
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

