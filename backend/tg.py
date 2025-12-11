import asyncio
from telethon import TelegramClient
from telethon.errors import (
    PhoneNumberBannedError,
    PhoneNumberInvalidError,
    PeerIdInvalidError,
)
from telethon.tl.functions.contacts import ImportContactsRequest
from telethon.tl.types import InputPhoneContact

api_id = 37698132
api_hash = "b29f51e475722c2e938429041e2f2b79"
phone = "+998904140184"  # твой номер

client = TelegramClient("session_name", api_id, api_hash)

async def main():
    await client.start(phone=phone)

    client_phone = "+998914160002"

    try:
        # Добавляем клиента во временные контакты
        result = await client(ImportContactsRequest([
            InputPhoneContact(
                client_id=0,         # ID контакта, 0 для нового
                phone=client_phone,
                first_name="TempUser",
                last_name=""         # обязательно, даже если пусто
            )
        ]))

        if not result.users:
            print("❌ Клиент НЕ найден в Telegram")
            return

        user = result.users[0]

        print(f"✅ Клиент найден: @{user.username if user.username else user.first_name}")

        # Отправляем сообщение
        await client.send_message(user.id, "Ассалому алейкум! Это тестовое сообщение 💬 которое отправляется из RedCRM скрипта")
        print("📨 Сообщение отправлено успешно!")

    except PhoneNumberInvalidError:
        print("❌ Неверный формат номера")

    except PeerIdInvalidError:
        print("❌ Номер скрыт, и его нельзя найти")

    except Exception as e:
        print("⚠️ Ошибка:", e)

asyncio.run(main())
