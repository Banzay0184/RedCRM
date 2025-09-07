// Утилиты для работы с ролями пользователей

// Роли пользователей
export const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    USER: 'user'
};

// Права доступа для каждой роли
export const ROLE_PERMISSIONS = {
    [USER_ROLES.ADMIN]: {
        canViewClients: true,
        canManageClients: true,
        canViewEvents: true,
        canManageEvents: true,
        canViewSettings: true,
        canManageSettings: true,
        canViewStatistics: true,
        canUseSessionStorage: true, // Админ использует sessionStorage
        canViewAllPages: true
    },
    [USER_ROLES.MANAGER]: {
        canViewClients: true,
        canManageClients: true,
        canViewEvents: true,
        canManageEvents: true,
        canViewSettings: false,
        canManageSettings: false,
        canViewStatistics: true,
        canUseSessionStorage: false,
        canViewAllPages: false
    },
    [USER_ROLES.USER]: {
        canViewClients: false,
        canManageClients: false,
        canViewEvents: true,
        canManageEvents: false,
        canViewSettings: false,
        canManageSettings: false,
        canViewStatistics: false,
        canUseSessionStorage: false,
        canViewAllPages: false
    }
};

// Функция для определения роли пользователя
export const getUserRole = (user) => {
    if (!user) return USER_ROLES.USER;
    
    // Если у пользователя есть поле is_staff, используем его
    if (user.is_staff !== undefined) {
        const role = user.is_staff ? USER_ROLES.ADMIN : USER_ROLES.USER;
        return role;
    }
    
    // Fallback для старых пользователей - определяем по username
    // Это временное решение для совместимости
    if (user.username === 'Rizo') {
        return USER_ROLES.ADMIN;
    }
    
    return USER_ROLES.USER;
};

// Функция для проверки прав доступа
export const hasPermission = (user, permission) => {
    const role = getUserRole(user);
    return ROLE_PERMISSIONS[role]?.[permission] || false;
};

// Функция для проверки, является ли пользователь админом
export const isAdmin = (user) => {
    return getUserRole(user) === USER_ROLES.ADMIN;
};

// Функция для проверки, может ли пользователь управлять клиентами
export const canManageClients = (user) => {
    return hasPermission(user, 'canManageClients');
};

// Функция для проверки, может ли пользователь управлять событиями
export const canManageEvents = (user) => {
    return hasPermission(user, 'canManageEvents');
};

// Функция для проверки, может ли пользователь видеть статистику
export const canViewStatistics = (user) => {
    return hasPermission(user, 'canViewStatistics');
};

// Функция для определения типа хранилища токена
export const getTokenStorage = (user) => {
    return hasPermission(user, 'canUseSessionStorage') ? 'sessionStorage' : 'localStorage';
};
