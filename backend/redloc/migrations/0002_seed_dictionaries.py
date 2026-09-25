from django.db import migrations

CITIES = [
    ("Ташкент", "Toshkent", "tashkent"),
    ("Самарканд", "Samarqand", "samarkand"),
    ("Бухара", "Buxoro", "bukhara"),
    ("Хива", "Xiva", "khiva"),
    ("Фергана", "Farg‘ona", "fergana"),
    ("Андижан", "Andijon", "andijan"),
    ("Наманган", "Namangan", "namangan"),
    ("Нукус", "Nukus", "nukus"),
    ("Ташкентская область", "Toshkent viloyati", "tashkent-region"),
]

CATEGORIES = [
    ("Интерьер", "Interyer", "interior", "sofa"),
    ("Экстерьер", "Eksteryer", "exterior", "building"),
    ("Природа", "Tabiat", "nature", "mountain"),
    ("Студия", "Studiya", "studio", "camera"),
    ("Город", "Shahar", "city", "city"),
    ("Дом", "Uy", "house", "home"),
    ("Бизнес", "Biznes", "business", "briefcase"),
    ("Промышленность", "Sanoat", "industrial", "factory"),
    ("Транспорт", "Transport", "transport", "car"),
    ("Исторические места", "Tarixiy joylar", "historic", "landmark"),
    ("Другое", "Boshqa", "other", "dots"),
]

SHOOT_TYPES = [
    ("Фотосессия", "Fotosessiya", "photoshoot", "camera"),
    ("Видеосъёмка", "Videosyomka", "video", "video"),
    ("Клип", "Klip", "clip", "music"),
    ("Fashion", "Fashion", "fashion", "shirt"),
    ("Свадьба", "To‘y", "wedding", "heart"),
    ("Реклама", "Reklama", "advertising", "megaphone"),
    ("Интервью", "Intervyu", "interview", "mic"),
    ("Кино", "Kino", "movie", "film"),
    ("Предметная съёмка", "Predmetli syomka", "product", "box"),
    ("Reels / Shorts", "Reels / Shorts", "reels", "smartphone"),
]

AMENITIES = [
    ("Парковка", "Avtoturargoh", "parking", "parking"),
    ("Wi-Fi", "Wi-Fi", "wifi", "wifi"),
    ("Кондиционер", "Konditsioner", "ac", "snowflake"),
    ("Гримёрка / примерочная", "Grimxona / kiyinish xonasi", "dressing-room", "shirt"),
    ("Отдельная зона", "Alohida zona", "separate-zone", "door"),
    ("Электричество 220В", "Elektr 220V", "power", "plug"),
    ("Естественный свет", "Tabiiy yorug‘lik", "daylight", "sun"),
    ("Световое оборудование", "Yoritish uskunalari", "lighting", "lamp"),
    ("Санузел", "Hojatxona", "toilet", "bath"),
    ("Кухня", "Oshxona", "kitchen", "coffee"),
]


def seed(apps, schema_editor):
    City = apps.get_model("redloc", "City")
    Category = apps.get_model("redloc", "Category")
    ShootType = apps.get_model("redloc", "ShootType")
    Amenity = apps.get_model("redloc", "Amenity")

    for i, (ru, uz, slug) in enumerate(CITIES):
        City.objects.get_or_create(slug=slug, defaults={"name_ru": ru, "name_uz": uz, "order": i})
    for model, rows in ((Category, CATEGORIES), (ShootType, SHOOT_TYPES), (Amenity, AMENITIES)):
        for i, (ru, uz, slug, icon) in enumerate(rows):
            model.objects.get_or_create(slug=slug, defaults={"name_ru": ru, "name_uz": uz, "icon": icon, "order": i})


class Migration(migrations.Migration):
    dependencies = [("redloc", "0001_initial")]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
