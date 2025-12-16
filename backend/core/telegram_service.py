import asyncio
import re
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import (
    PhoneNumberInvalidError,
    PeerIdInvalidError,
    FloodWaitError,
    SessionPasswordNeededError,
)
from dotenv import load_dotenv
from telethon.tl.functions.contacts import ImportContactsRequest, GetContactsRequest, DeleteContactsRequest
from telethon.tl.types import InputPhoneContact
from django.conf import settings

logger = logging.getLogger(__name__)

load_dotenv()


class TelegramService:
    """Сервис для работы с Telegram API с кэшированием клиента."""

    _client: Optional[TelegramClient] = None
    _client_started: bool = False
    _thread_lock = threading.Lock()  # Thread-safe lock для синхронизации между разными event loops
    _init_lock = threading.Lock()  # Lock для инициализации клиента
    _phone_cache: Dict[str, Tuple[int, datetime]] = {}  # Кэш номеров телефонов -> (user_id, timestamp) с TTL
    _phone_cache_ttl = timedelta(hours=1)  # TTL для кэша номеров телефонов
    _sending_locks: Dict[str, threading.Lock] = {}  # Блокировки для предотвращения повторной отправки
    _sending_lock = threading.Lock()  # Lock для управления _sending_locks
    _thread_local = threading.local()  # Thread-local storage для клиентов в разных потоках
    _session_lock = threading.Lock()  # Глобальный lock для операций с sqlite-сессией Telethon

    @classmethod
    def _get_client(cls) -> TelegramClient:
        """Получить или создать клиент Telegram для текущего потока."""
        # Используем thread-local storage для хранения клиента в каждом потоке
        thread_id = threading.current_thread().ident
        
        # Проверяем, есть ли клиент для этого потока и event loop
        if hasattr(cls._thread_local, 'client') and cls._thread_local.client is not None:
            try:
                # Проверяем, что клиент использует текущий event loop
                current_loop = asyncio.get_event_loop()
                if hasattr(cls._thread_local.client, '_loop') and cls._thread_local.client._loop == current_loop:
                    return cls._thread_local.client
                else:
                    # Loop изменился, нужно пересоздать клиент
                    logger.warning(f"Event loop изменился, пересоздаем клиент для потока {threading.current_thread().name}")
                    if cls._thread_local.client.is_connected():
                        # Закрываем старое соединение асинхронно (но мы в синхронном контексте)
                        pass
                    cls._thread_local.client = None
            except RuntimeError:
                # Нет текущего event loop, создадим новый клиент
                cls._thread_local.client = None
        
        # Создаем новый клиент
        api_id = getattr(settings, 'TG_API_ID', None)
        api_hash = getattr(settings, 'TG_API_HASH', None)
        session_string = getattr(settings, 'TG_SESSION_STRING', None)

        if not api_id or not api_hash:
            raise ValueError("TG_API_ID и TG_API_HASH должны быть установлены в settings.py")

        # Получаем текущий event loop (должен быть установлен в run_async_telegram)
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # Если нет event loop, создаем новый (но это не должно происходить)
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            logger.warning(f"Создан новый event loop для потока {threading.current_thread().name}")
        
        # Проверяем, что loop не закрыт
        if loop.is_closed():
            raise RuntimeError("Event loop закрыт. Невозможно создать Telegram клиент.")

        # Создаем клиент с текущим event loop
        if session_string:
            # Используем StringSession (сессия в строке, без sqlite-файла)
            session = StringSession(session_string)
            cls._thread_local.client = TelegramClient(session, api_id, api_hash, loop=loop)
            logger.info("Telegram клиент создан с использованием StringSession")
        else:
            # Fallback: старый способ с файловой сессией (можно удалить, когда StringSession будет настроен)
            session_file = getattr(settings, 'TG_SESSION_FILE', 'session_name')
            cls._thread_local.client = TelegramClient(session_file, api_id, api_hash, loop=loop)
            logger.warning("TG_SESSION_STRING не задан. Используется файловая сессия (sqlite).")
        cls._thread_local.client_started = False
        logger.info(f"Telegram клиент создан для потока {threading.current_thread().name}")
        
        return cls._thread_local.client

    @classmethod
    async def _ensure_client(cls):
        """Убедиться, что клиент запущен и подключен (thread-safe)."""
        client = cls._get_client()
        
        # Проверяем подключение для текущего потока
        if hasattr(cls._thread_local, 'client_started') and cls._thread_local.client_started and client.is_connected():
            return
        
        # Используем thread lock для синхронизации в рамках одного потока
        if not hasattr(cls._thread_local, 'lock'):
            cls._thread_local.lock = threading.Lock()
        
        with cls._thread_local.lock:
            # Двойная проверка после получения lock
            if hasattr(cls._thread_local, 'client_started') and cls._thread_local.client_started and client.is_connected():
                return
            
            # Проверяем подключение
            if not client.is_connected():
                phone = getattr(settings, 'TG_PHONE', None)
                try:
                    # Оборачиваем start в задачу, чтобы все вложенные операции работали правильно
                    loop = asyncio.get_event_loop()
                    if phone:
                        start_task = loop.create_task(client.start(phone=phone))
                    else:
                        start_task = loop.create_task(client.start())
                    await start_task
                    cls._thread_local.client_started = True
                    logger.info(f"Telegram клиент успешно запущен и подключен в потоке {threading.current_thread().name}")
                except Exception as e:
                    cls._thread_local.client_started = False
                    logger.error(f"Ошибка при запуске Telegram клиента: {e}")
                    raise
            else:
                cls._thread_local.client_started = True
                logger.info(f"Telegram клиент уже подключен (переиспользован) в потоке {threading.current_thread().name}")

    @classmethod
    def validate_phone_number(cls, phone: str) -> bool:
        """
        Валидация номера телефона.
        Принимает формат: +998XXXXXXXXX или 998XXXXXXXXX (где X - цифры 0-9)
        
        Args:
            phone: Номер телефона для валидации
            
        Returns:
            bool: True если номер валиден, False в противном случае
        """
        if not phone or not isinstance(phone, str):
            return False

        # Убираем пробелы, дефисы и другие символы
        phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('+', '', 1)

        # Проверяем формат: должен начинаться с 998, затем ровно 9 цифр
        # Общий формат: 998XXXXXXXXX (12 цифр всего)
        pattern = r'^998\d{9}$'
        if not re.match(pattern, phone):
            return False
        
        # Дополнительная проверка: все символы должны быть цифрами
        if not phone.isdigit():
            return False
            
        # Проверка длины: должно быть 12 цифр (998 + 9 цифр)
        if len(phone) != 12:
            return False
            
        return True

    @classmethod
    def normalize_phone(cls, phone: str) -> str:
        """
        Нормализация номера телефона к формату +998XXXXXXXXX.
        
        Args:
            phone: Номер телефона для нормализации
            
        Returns:
            str: Нормализованный номер в формате +998XXXXXXXXX
        """
        if not phone or not isinstance(phone, str):
            return phone

        # Убираем пробелы, дефисы и другие символы
        phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

        # Убираем + если есть
        if phone.startswith('+'):
            phone = phone[1:]

        # Если номер начинается с 998, оставляем как есть
        if phone.startswith('998'):
            return '+' + phone
        
        # Если номер не начинается с 998, но состоит из 9 цифр, добавляем 998
        if phone.isdigit() and len(phone) == 9:
            return '+998' + phone
        
        # Если номер уже в правильном формате (12 цифр), добавляем +
        if phone.isdigit() and len(phone) == 12 and phone.startswith('998'):
            return '+' + phone

        # Если ничего не подошло, возвращаем как есть (валидация потом проверит)
        return '+' + phone if not phone.startswith('+') else phone

    @classmethod
    async def _find_user_by_phone(cls, phone: str) -> Optional[Dict]:
        """
        Найти пользователя по номеру телефона без изменения контактов.
        
        Args:
            phone: Номер телефона
            
        Returns:
            Dict с user_id и username или None если не найден
        """
        client = cls._get_client()
        
        # Проверяем кэш с TTL
        if phone in cls._phone_cache:
            user_id, timestamp = cls._phone_cache[phone]
            # Проверяем, не истек ли TTL
            if datetime.now() - timestamp < cls._phone_cache_ttl:
                try:
                    # Проверяем, что пользователь все еще доступен
                    user = await client.get_entity(user_id)
                    return {
                        'user_id': user_id,
                        'username': user.username or user.first_name or ""
                    }
                except Exception:
                    # Если пользователь недоступен, удаляем из кэша
                    del cls._phone_cache[phone]
            else:
                # TTL истек, удаляем из кэша
                del cls._phone_cache[phone]
        
        # Пытаемся найти в существующих контактах (пропускаем, если есть проблемы с event loop)
        # Используем только ImportContactsRequest, так как он более надежен
        
        # Импортируем контакт временно
        try:
            result = await client(ImportContactsRequest([
                InputPhoneContact(
                    client_id=0,
                    phone=phone,
                    first_name="",  # Пустое имя, чтобы не менять существующее
                    last_name=""
                )
            ]))
            
            if not result.users:
                return None
            
            user = result.users[0]
            telegram_user_id = user.id
            username = user.username or user.first_name or ""
            
            # Сохраняем в кэш с timestamp
            cls._phone_cache[phone] = (telegram_user_id, datetime.now())
            
            # Удаляем временный контакт, если он был создан
            # (если контакт уже существовал, он не будет удален)
            try:
                # Проверяем, был ли это новый контакт (в imported есть только новые)
                if result.imported:
                    await client(DeleteContactsRequest([user]))
                    logger.info(f"Временный контакт {phone} удален после использования")
            except Exception as e:
                logger.warning(f"Не удалось удалить временный контакт: {e}")
            
            return {
                'user_id': telegram_user_id,
                'username': username
            }
        except Exception as e:
            logger.error(f"Ошибка при поиске пользователя по номеру {phone}: {e}")
            return None

    @classmethod
    def _get_sending_lock(cls, phone: str) -> threading.Lock:
        """Получить или создать lock для конкретного номера телефона."""
        with cls._sending_lock:
            if phone not in cls._sending_locks:
                cls._sending_locks[phone] = threading.Lock()
            return cls._sending_locks[phone]

    @classmethod
    async def send_message(cls, phone: str, text: str) -> Dict:
        """
        Отправить сообщение в Telegram по номеру телефона.
        Не изменяет имя существующего контакта и отправляет сообщение только один раз.

        Args:
            phone: Номер телефона в формате +998XXXXXXXXX
            text: Текст сообщения

        Returns:
            Dict с ключами:
                - ok: bool - успешна ли отправка
                - telegram_user_id: int - ID пользователя в Telegram (если найден)
                - username: str - username пользователя (если есть)
                - error: str - текст ошибки (если есть)
        """
        # Валидация номера
        if not cls.validate_phone_number(phone):
            normalized = cls.normalize_phone(phone)
            if not cls.validate_phone_number(normalized):
                return {
                    'ok': False,
                    'error': 'Неверный формат номера телефона. Ожидается формат: +998XXXXXXXXX'
                }
            phone = normalized

        # Получаем lock для этого номера, чтобы предотвратить одновременную отправку
        sending_lock = cls._get_sending_lock(phone)
        
        # Проверяем, не идет ли уже отправка на этот номер
        if not sending_lock.acquire(blocking=False):
            return {
                'ok': False,
                'error': 'Отправка сообщения на этот номер уже выполняется. Пожалуйста, подождите.'
            }

        # Глобальный lock, чтобы исключить одновременный доступ к sqlite-сессии Telethon
        with cls._session_lock:
            try:
                # Убеждаемся, что клиент запущен
                await cls._ensure_client()
                
                # Находим пользователя без изменения контактов
                user_info = await cls._find_user_by_phone(phone)
                
                if not user_info:
                    return {
                        'ok': False,
                        'error': 'Клиент не найден в Telegram. Убедитесь, что номер зарегистрирован в Telegram.'
                    }

                telegram_user_id = user_info['user_id']
                username = user_info['username']

                # Отправляем сообщение только один раз
                await cls._get_client().send_message(telegram_user_id, text)

                logger.info(f"Сообщение успешно отправлено на {phone} (user_id: {telegram_user_id})")

                return {
                    'ok': True,
                    'telegram_user_id': telegram_user_id,
                    'username': username,
                    'error': None
                }

            except PhoneNumberInvalidError:
                error_msg = 'Неверный формат номера телефона'
                logger.error(f"{error_msg}: {phone}")
                return {'ok': False, 'error': error_msg}

            except PeerIdInvalidError:
                error_msg = 'Номер скрыт в настройках приватности Telegram и его нельзя найти'
                logger.error(f"{error_msg}: {phone}")
                return {'ok': False, 'error': error_msg}

            except FloodWaitError as e:
                error_msg = f'Превышен лимит запросов. Попробуйте через {e.seconds} секунд'
                logger.error(f"{error_msg}: {phone}")
                return {'ok': False, 'error': error_msg}

            except SessionPasswordNeededError:
                error_msg = 'Требуется двухфакторная аутентификация для сессии Telegram'
                logger.error(f"{error_msg}: {phone}")
                return {'ok': False, 'error': error_msg}

            except Exception as e:
                error_msg = f'Ошибка при отправке сообщения: {str(e)}'
                logger.error(f"{error_msg}: {phone}", exc_info=True)
                return {'ok': False, 'error': error_msg}
                
            finally:
                # Освобождаем lock в любом случае
                sending_lock.release()

    @classmethod
    async def disconnect(cls):
        """Отключить клиент (для тестирования или перезапуска)."""
        if hasattr(cls._thread_local, 'client') and cls._thread_local.client and cls._thread_local.client.is_connected():
            await cls._thread_local.client.disconnect()
            cls._thread_local.client_started = False
            cls._thread_local.client = None
            logger.info(f"Telegram клиент отключен в потоке {threading.current_thread().name}")

