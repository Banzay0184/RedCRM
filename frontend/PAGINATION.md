# Руководство по пагинации

## Обзор

В проекте реализована поддержка пагинации для списков событий и клиентов. Backend использует Django REST Framework с `PageNumberPagination` (размер страницы: 10 элементов).

## Использование

### События (Events)

```javascript
import { useEvents } from '../hooks/useEvents';
import Pagination from '../components/Pagination';

const EventPage = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    
    const { data: eventsData, isLoading } = useEvents(currentPage, pageSize);
    const events = eventsData?.data || [];
    const pagination = eventsData?.pagination;
    
    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    return (
        <>
            {/* Список событий */}
            <EventList events={events} />
            
            {/* Компонент пагинации */}
            {pagination && (
                <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                />
            )}
        </>
    );
};
```

### Клиенты (Clients)

```javascript
import { useClients } from '../hooks/useClients';
import Pagination from '../components/Pagination';

const ClientPage = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    
    const { data: clientsData } = useClients(currentPage, pageSize);
    const clients = clientsData?.data || [];
    const pagination = clientsData?.pagination;
    
    return (
        <>
            {/* Список клиентов */}
            {clients.map(client => ...)}
            
            {/* Пагинация */}
            {pagination && (
                <Pagination
                    pagination={pagination}
                    onPageChange={setCurrentPage}
                />
            )}
        </>
    );
};
```

## Структура данных

Backend возвращает данные в формате Django REST Framework:

```json
{
  "count": 100,
  "next": "http://api.example.com/events/?page=2",
  "previous": null,
  "results": [...]
}
```

Хуки автоматически преобразуют это в:

```javascript
{
  data: [...], // массив результатов
  pagination: {
    count: 100,
    next: "http://...",
    previous: null,
    currentPage: 1,
    pageSize: 10,
    totalPages: 10
  }
}
```

## Компонент Pagination

Компонент `Pagination` автоматически:
- Показывает информацию о количестве элементов
- Отображает номера страниц с умным сокращением (многоточие)
- Показывает кнопки "Назад" и "Вперед"
- Скрывается, если страниц меньше 2

### Пропсы

- `pagination` (обязательный) - объект с информацией о пагинации
- `onPageChange` (обязательный) - функция для изменения страницы

### Пример использования

```javascript
<Pagination
    pagination={{
        currentPage: 1,
        totalPages: 10,
        count: 100,
        pageSize: 10
    }}
    onPageChange={(page) => setCurrentPage(page)}
/>
```

## Автоматическое поведение

1. **Сброс страницы при фильтрации**: При изменении фильтров страница автоматически сбрасывается на первую
2. **Прокрутка вверх**: При смене страницы автоматически прокручивается вверх
3. **Кэширование**: React Query кэширует каждую страницу отдельно
4. **Плавные переходы**: Используется `keepPreviousData` для плавных переходов между страницами

## Настройка размера страницы

Размер страницы можно изменить в хуках:

```javascript
const pageSize = 20; // вместо 10
const { data } = useEvents(currentPage, pageSize);
```

Или в настройках backend в `settings.py`:

```python
REST_FRAMEWORK = {
    "PAGE_SIZE": 20,  # изменить размер страницы
}
```

## Обработка без пагинации

Если backend не возвращает пагинацию (старый формат), хуки автоматически обрабатывают это:

```javascript
// Если нет пагинации, возвращается:
{
  data: [...], // данные как есть
  pagination: null // пагинация отсутствует
}
```

В этом случае компонент `Pagination` не отображается.

