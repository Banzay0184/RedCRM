from telethon import TelegramClient
from telethon.sessions import StringSession
import os
from dotenv import load_dotenv


"""
Этот скрипт создает НОВУЮ StringSession.
Нужно один раз авторизоваться (ввести код из Telegram), после чего строка сессии
будет выведена в консоль. Её нужно скопировать в переменную окружения TG_SESSION_STRING.
"""

load_dotenv()

TG_API_ID = '21819507'
TG_API_HASH = '55bb35193fc5eaee8aaec20c34e62dcc'

if not TG_API_ID or not TG_API_HASH:
    raise RuntimeError("TG_API_ID и TG_API_HASH должны быть заданы в .env")

# Создаем клиент с новой StringSession (без sqlite-файла)
with TelegramClient(StringSession(), TG_API_ID, TG_API_HASH) as client:
    # Здесь Telethon попросит ввести код/пароль, если нужно
    print("\n=== TG_SESSION_STRING ===\n")
    print(client.session.save())
    print("\n=========================\n")
