# Руководство по использованию React Query

## Введение

React Query (TanStack Query) интегрирован в проект для оптимизации работы с API запросами. Он предоставляет автоматическое кэширование, синхронизацию данных и управление состоянием сервера.

## Основные концепции

### Query (Запросы)
Используются для получения данных с сервера. Автоматически кэшируются и могут быть переиспользованы.

### Mutation (Мутации)
Используются для изменения данных на сервере (создание, обновление, удаление). Автоматически инвалидируют связанные запросы.

## Использование хуков

### События (Events)

```javascript
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '../hooks/useEvents';

// Получение списка событий
const { data: events = [], isLoading, error } = useEvents();

// Создание события
const createMutation = useCreateEvent();
await createMutation.mutateAsync(eventData);

// Обновление события
const updateMutation = useUpdateEvent();
await updateMutation.mutateAsync({ id: eventId, data: eventData });

// Удаление события
const deleteMutation = useDeleteEvent();
await deleteMutation.mutateAsync(eventId);
```

### Клиенты (Clients)

```javascript
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '../hooks/useClients';

const { data: clients = [] } = useClients();
```

### Услуги (Services)

```javascript
import { useServices, useCreateService, useUpdateService, useDeleteService } from '../hooks/useServices';

const { data: services = [] } = useServices();
```

### Работники (Workers)

```javascript
import { useWorkers, useCreateWorker, useUpdateWorker, useDeleteWorker, useUpdateWorkersOrder } from '../hooks/useWorkers';

const { data: workers = [] } = useWorkers();
```

## Обработка состояний

### Загрузка
```javascript
const { data, isLoading, isFetching } = useEvents();

if (isLoading) {
    return <div>Загрузка...</div>;
}
```

### Ошибки
```javascript
const { data, error, isError } = useEvents();

if (isError) {
    return <div>Ошибка: {error.message}</div>;
}
```

### Успешные мутации
```javascript
const createMutation = useCreateEvent();

createMutation.mutate(eventData, {
    onSuccess: (data) => {
        toast.success('Событие создано!');
    },
    onError: (error) => {
        toast.error('Ошибка при создании');
    }
});
```

## Инвалидация кэша

Кэш автоматически инвалидируется при мутациях. Но можно вручную:

```javascript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Инвалидировать все запросы событий
queryClient.invalidateQueries({ queryKey: ['events'] });

// Инвалидировать конкретный запрос
queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] });
```

## Оптимистичные обновления

Для мгновенного обновления UI:

```javascript
const updateMutation = useUpdateEvent();

updateMutation.mutate(
    { id: eventId, data: newData },
    {
        onMutate: async (newData) => {
            // Отменяем текущие запросы
            await queryClient.cancelQueries({ queryKey: ['events'] });
            
            // Сохраняем предыдущее значение
            const previousEvents = queryClient.getQueryData(['events']);
            
            // Оптимистично обновляем
            queryClient.setQueryData(['events'], (old) => 
                old.map(event => event.id === newData.id ? newData : event)
            );
            
            return { previousEvents };
        },
        onError: (err, newData, context) => {
            // Откатываем при ошибке
            queryClient.setQueryData(['events'], context.previousEvents);
        }
    }
);
```

## Настройки кэширования

Настройки находятся в `App.jsx`:

```javascript
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 минут
            cacheTime: 10 * 60 * 1000, // 10 минут
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
```

## Лучшие практики

1. **Используйте хуки вместо прямых вызовов API** - это обеспечивает кэширование
2. **Обрабатывайте состояния загрузки и ошибок** - улучшает UX
3. **Используйте инвалидацию кэша** - для синхронизации данных
4. **Настраивайте staleTime** - в зависимости от частоты изменений данных
5. **Используйте оптимистичные обновления** - для лучшего UX

## Отладка

Для отладки кэша в development режиме можно установить React Query DevTools:

```bash
npm install @tanstack/react-query-devtools
```

Затем добавить в `App.jsx`:

```javascript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// В компоненте App
<ReactQueryDevtools initialIsOpen={false} />
```

