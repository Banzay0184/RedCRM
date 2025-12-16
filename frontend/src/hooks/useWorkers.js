import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkers, getWorkerById, createWorker, updateWorker, deleteWorker, updateWorkersOrder } from '../api';

// Query keys для кэширования
export const workerKeys = {
    all: ['workers'],
    lists: () => [...workerKeys.all, 'list'],
    details: () => [...workerKeys.all, 'detail'],
    detail: (id) => [...workerKeys.details(), id],
};

// Хук для получения всех работников
export const useWorkers = () => {
    return useQuery({
        queryKey: workerKeys.lists(),
        queryFn: async () => {
            const response = await getWorkers();
            // Сортируем работников по полю 'order'
            const sortedWorkers = response.data.sort((a, b) => a.order - b.order);
            return sortedWorkers;
        },
        staleTime: 5 * 60 * 1000, // 5 минут для списка работников
    });
};

// Хук для создания работника
export const useCreateWorker = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: createWorker,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workerKeys.lists() });
        },
    });
};

// Хук для обновления работника
export const useUpdateWorker = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }) => updateWorker(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: workerKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: workerKeys.lists() });
        },
    });
};

// Хук для удаления работника
export const useDeleteWorker = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: deleteWorker,
        onSuccess: (_, workerId) => {
            queryClient.removeQueries({ queryKey: workerKeys.detail(workerId) });
            queryClient.invalidateQueries({ queryKey: workerKeys.lists() });
        },
    });
};

// Хук для обновления порядка работников
export const useUpdateWorkersOrder = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: updateWorkersOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workerKeys.lists() });
        },
    });
};

// Хук для получения детальной информации о работнике
export const useWorkerDetail = (workerId) => {
    return useQuery({
        queryKey: workerKeys.detail(workerId),
        queryFn: async () => {
            const response = await getWorkerById(workerId);
            return response.data;
        },
        enabled: !!workerId, // Запрос выполняется только если workerId существует
        staleTime: 2 * 60 * 1000, // 2 минуты
    });
};

