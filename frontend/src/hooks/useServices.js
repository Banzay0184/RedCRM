import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServices, createService, updateService, deleteService } from '../api';

// Query keys для кэширования
export const serviceKeys = {
    all: ['services'],
    lists: () => [...serviceKeys.all, 'list'],
    details: () => [...serviceKeys.all, 'detail'],
    detail: (id) => [...serviceKeys.details(), id],
};

// Хук для получения всех услуг
export const useServices = () => {
    return useQuery({
        queryKey: serviceKeys.lists(),
        queryFn: async () => {
            const response = await getServices();
            return response.data;
        },
        staleTime: 10 * 60 * 1000, // 10 минут - услуги редко меняются
    });
};

// Хук для создания услуги
export const useCreateService = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: createService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
        },
    });
};

// Хук для обновления услуги
export const useUpdateService = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }) => updateService(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
        },
    });
};

// Хук для удаления услуги
export const useDeleteService = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: deleteService,
        onSuccess: (_, serviceId) => {
            queryClient.removeQueries({ queryKey: serviceKeys.detail(serviceId) });
            queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
        },
    });
};

