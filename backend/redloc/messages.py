def access_link_message(link, url):
    """Текст сообщения клиенту в Telegram (RU + UZ)."""
    until = link.expires_at.strftime("%d.%m.%Y %H:%M")
    name = (link.client.name if link.client and link.client.name else "").strip()
    hello_ru = f"Здравствуйте, {name}!" if name else "Здравствуйте!"
    hello_uz = f"Assalomu alaykum, {name}!" if name else "Assalomu alaykum!"
    return (
        "🎬 **RED VIDEO GROUP · REDLOC**\n\n"
        f"{hello_ru}\n"
        "Подобрали для вас каталог локаций для фото и видео съёмки 📸\n"
        f"👉 {url}\n"
        f"⏳ Ссылка действует до **{until}**.\n\n"
        f"{hello_uz}\n"
        "Siz uchun foto va video syomka lokatsiyalari katalogi 📸\n"
        f"👉 {url}\n"
        f"⏳ Havola **{until}** gacha amal qiladi."
    )
