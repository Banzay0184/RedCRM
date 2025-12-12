import os
import django
import sqlite3

# Указываем путь к настройкам Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")  # <-- проверь этот путь

# Инициализируем Django
django.setup()

from django.conf import settings

# путь к базе
db_path = settings.DATABASES['default']['NAME']

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Создаём таблицы
tables_sql = [
"""
CREATE TABLE IF NOT EXISTS core_telegramcontractlog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    event_id INTEGER NOT NULL,
    phone VARCHAR(15) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'error',
    error TEXT,
    message_text TEXT,
    telegram_user_id BIGINT,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES core_event(id) ON DELETE CASCADE
);
""",
"""
CREATE TABLE IF NOT EXISTS core_telegramadvancenotificationlog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    event_id INTEGER NOT NULL,
    phone VARCHAR(15) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'error',
    error TEXT,
    message_text TEXT,
    telegram_user_id BIGINT,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES core_event(id) ON DELETE CASCADE
);
"""
]

for sql in tables_sql:
    cursor.execute(sql)

conn.commit()
conn.close()

print("✅ Таблицы успешно созданы!")
