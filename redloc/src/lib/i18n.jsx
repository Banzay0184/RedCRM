import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const DICT = {
  ru: {
    tagline: 'Locations for Photo & Video',
    'nav.home': 'Главная', 'nav.locations': 'Локации', 'nav.photos': 'Фото', 'nav.videos': 'Видео',
    'nav.categories': 'Категории', 'nav.tags': 'Теги', 'nav.favorites': 'Избранное', 'nav.requests': 'Заявки',
    'nav.settings': 'Настройки', 'nav.profile': 'Профиль', 'nav.admin': 'Управление',
    'footer.brand': 'Интеграция для вашего бизнеса',
    'search.placeholder': 'Поиск локаций, тегов, городов...', 'search.byName': 'Поиск по названию...',
    'search.find': 'Найти', 'all.cities': 'Все города', 'all.categories': 'Все категории',
    'hero.title': 'Локации для фото\nи видео съёмок',
    'hero.subtitle': 'Тысячи уникальных мест для ваших проектов.\nБыстро, удобно, профессионально.',
    'home.popular': 'Популярные локации', 'home.new': 'Новые локации', 'home.categories': 'Категории',
    'home.seeAll': 'Смотреть все',
    'feat.base': 'Большая база\nлокаций', 'feat.verified': 'Только проверенные\nлокации',
    'feat.quality': 'Фото и видео\nв высоком качестве', 'feat.fav': 'Избранное\nи быстрый доступ',
    'feat.crm': 'Интеграция с REDCRM\n(проекты, клиенты, заказы)', 'feat.slogan': 'Лучшие локации\nдля ваших идей',
    photos: 'фото', videos: 'видео', views: 'просмотров',
    'badge.premium': 'Премиум', 'badge.hit': 'Хит', 'badge.new': 'Новинка',
    'filters.title': 'Фильтры', 'filters.city': 'Город', 'filters.category': 'Категории',
    'filters.shootType': 'Подходит для', 'filters.amenities': 'Удобства', 'filters.other': 'Прочее',
    'filters.withVideo': 'Только с видео', 'filters.reset': 'Сбросить', 'filters.show': 'Показать',
    'sort.label': 'Сортировка', 'sort.default': 'Рекомендуемые', 'sort.new': 'Новые', 'sort.popular': 'Популярные',
    'sort.photos': 'Больше фото', 'sort.title': 'По названию',
    'catalog.found': 'Найдено', 'catalog.more': 'Показать ещё', 'catalog.empty': 'Ничего не найдено',
    'catalog.emptyHint': 'Попробуйте изменить фильтры или поисковый запрос',
    'loc.suitable': 'Подходит для:', 'loc.amenities': 'Удобства', 'loc.zones': 'Кадры и зоны',
    'loc.allZones': 'Все', 'loc.gallery': 'Галерея', 'loc.addFav': 'Добавить в избранное',
    'loc.inFav': 'В избранном', 'loc.contact': 'Связаться', 'loc.similar': 'Похожие локации',
    'loc.videoPreview': 'Видеопревью локации', 'loc.noPhotos': 'Фото пока нет', 'loc.noVideos': 'Видео пока нет',
    'loc.edit': 'Редактировать', 'loc.hidden': 'Скрыта', 'loc.share': 'Поделиться', 'loc.copied': 'Ссылка скопирована',
    'loc.notFound': 'Локация не найдена',
    'req.title': 'Заявка на съёмку', 'req.name': 'Ваше имя', 'req.phone': 'Телефон', 'req.type': 'Тип съёмки',
    'req.date': 'Дата съёмки', 'req.message': 'Комментарий', 'req.send': 'Отправить заявку',
    'req.sent': 'Заявка отправлена! Мы свяжемся с вами.', 'req.choose': 'Не выбрано',
    'fav.title': 'Список избранного', 'fav.empty': 'В избранном пока пусто',
    'fav.emptyHint': 'Нажмите ♡ на карточке локации, чтобы сохранить её',
    'fav.guestHint': 'Избранное хранится в этом браузере. Войдите, чтобы сохранить его в аккаунте.',
    'photos.title': 'Фото локаций', 'videos.title': 'Видео локаций', 'cats.title': 'Категории',
    'tags.title': 'Теги', 'tags.search': 'Найти тег...',
    'login.title': 'Вход', 'login.subtitle': 'Используйте логин и пароль от REDCRM', 'login.username': 'Логин',
    'login.password': 'Пароль', 'login.submit': 'Войти', 'login.error': 'Неверный логин или пароль',
    'user.login': 'Войти', 'user.logout': 'Выйти', 'user.admin': 'Администратор', 'user.user': 'Пользователь',
    'common.save': 'Сохранить', 'common.cancel': 'Отмена', 'common.delete': 'Удалить', 'common.add': 'Добавить',
    'common.edit': 'Изменить', 'common.close': 'Закрыть', 'common.loading': 'Загрузка...', 'common.back': 'Назад',
    'common.error': 'Ошибка', 'common.saved': 'Сохранено', 'common.deleted': 'Удалено', 'common.yes': 'Да',
    'common.confirmDelete': 'Удалить безвозвратно?', 'common.all': 'Все', 'common.search': 'Поиск',
    'notFound.title': 'Страница не найдена', 'notFound.home': 'На главную',
    'access.title': 'Доступ к сайту закрыт', 'access.expired': 'Срок действия вашей ссылки истёк.',
    'access.revoked': 'Ссылка была отозвана.', 'access.invalid': 'Ссылка недействительна.',
    'access.onlyByLink': 'Каталог доступен по персональной ссылке от RED VIDEO GROUP.',
    'access.askManager': 'Запросите новую ссылку у менеджера.', 'access.staffLogin': 'Вход для сотрудников',
    'access.until': 'Доступ до',
    'a.addLocation': 'Добавить локацию', 'a.editLocation': 'Редактировать локацию', 'a.openPage': 'Открыть страницу',
    'a.mainInfo': 'Основная информация', 'a.name': 'Название', 'a.namePlaceholder': 'Например: Modern Apartment',
    'a.addressHint': 'Район / ориентир', 'a.addressHintHelp': 'Без точного адреса и карты',
    'a.tagsHint': 'Enter или запятая — добавить тег', 'a.tagsPlaceholder': 'Добавьте теги',
    'a.description': 'Описание', 'a.descPlaceholder': 'Краткое описание локации...',
    'a.amenitiesTitle': 'Удобства и особенности', 'a.publication': 'Публикация', 'a.published': 'Опубликована',
    'a.featured': 'Популярная (на главной)', 'a.badge': 'Метка', 'a.needCategory': 'Выберите хотя бы одну категорию',
    'a.photos': 'Фотографии', 'a.videos': 'Видео', 'a.uploadPhotos': 'Загрузите фото',
    'a.dropHint': 'Перетащите файлы сюда или выберите. JPG, PNG, WebP — до 25 МБ',
    'a.chooseFiles': 'Выбрать файлы', 'a.uploading': 'Загрузка...', 'a.uploaded': 'Загружено',
    'a.notUploaded': 'Не загружено', 'a.dragHint': 'Перетаскивайте фото, чтобы изменить порядок. Первое — обложка.',
    'a.cover': 'Обложка', 'a.makeCover': 'Сделать обложкой', 'a.photo': 'Фото', 'a.caption': 'Подпись',
    'a.zone': 'Зона / кадр', 'a.zonesHint': 'Сначала добавьте зоны в блоке «Кадры и зоны»',
    'a.saveFirst': 'Сохраните локацию, чтобы добавить видео и зоны', 'a.file': 'Файл', 'a.videoTitle': 'Название видео',
    'a.videoFile': 'Видеофайл', 'a.poster': 'Обложка видео', 'a.addVideo': 'Добавить видео',
    'a.chooseVideo': 'Выберите видеофайл', 'a.youtubeRequired': 'Вставьте ссылку на YouTube',
    'a.zonesIntro': 'Зоны помогают искать кадры: «Диван», «Окно в пол», «Кирпичная стена», «Зеркало». Привяжите к ним фото.',
    'a.zoneName': 'Название зоны', 'a.zonePlaceholder': 'Например: Окно в пол', 'a.deleteLocation': 'Удалить локацию',
    'a.note': 'Заметка менеджера...', 'a.noRequests': 'Заявок нет',
    'status.new': 'Новая', 'status.in_progress': 'В работе', 'status.done': 'Завершена', 'status.rejected': 'Отклонена',
  },
  uz: {
    tagline: 'Locations for Photo & Video',
    'nav.home': 'Bosh sahifa', 'nav.locations': 'Lokatsiyalar', 'nav.photos': 'Foto', 'nav.videos': 'Video',
    'nav.categories': 'Kategoriyalar', 'nav.tags': 'Teglar', 'nav.favorites': 'Sevimlilar', 'nav.requests': 'Arizalar',
    'nav.settings': 'Sozlamalar', 'nav.profile': 'Profil', 'nav.admin': 'Boshqaruv',
    'footer.brand': 'Biznesingiz uchun integratsiya',
    'search.placeholder': 'Lokatsiya, teg, shahar qidirish...', 'search.byName': 'Nomi bo‘yicha qidirish...',
    'search.find': 'Topish', 'all.cities': 'Barcha shaharlar', 'all.categories': 'Barcha kategoriyalar',
    'hero.title': 'Foto va video syomka\nuchun lokatsiyalar',
    'hero.subtitle': 'Loyihalaringiz uchun minglab noyob joylar.\nTez, qulay, professional.',
    'home.popular': 'Mashhur lokatsiyalar', 'home.new': 'Yangi lokatsiyalar', 'home.categories': 'Kategoriyalar',
    'home.seeAll': 'Barchasini ko‘rish',
    'feat.base': 'Katta lokatsiyalar\nbazasi', 'feat.verified': 'Faqat tekshirilgan\nlokatsiyalar',
    'feat.quality': 'Yuqori sifatli\nfoto va video', 'feat.fav': 'Sevimlilar va\ntezkor kirish',
    'feat.crm': 'REDCRM bilan integratsiya\n(loyihalar, mijozlar, buyurtmalar)', 'feat.slogan': 'G‘oyalaringiz uchun\neng yaxshi joylar',
    photos: 'foto', videos: 'video', views: 'ko‘rish',
    'badge.premium': 'Premium', 'badge.hit': 'Xit', 'badge.new': 'Yangi',
    'filters.title': 'Filtrlar', 'filters.city': 'Shahar', 'filters.category': 'Kategoriyalar',
    'filters.shootType': 'Nima uchun mos', 'filters.amenities': 'Qulayliklar', 'filters.other': 'Boshqa',
    'filters.withVideo': 'Faqat videoli', 'filters.reset': 'Tozalash', 'filters.show': 'Ko‘rsatish',
    'sort.label': 'Saralash', 'sort.default': 'Tavsiya etilgan', 'sort.new': 'Yangilari', 'sort.popular': 'Mashhurlari',
    'sort.photos': 'Ko‘p foto', 'sort.title': 'Nomi bo‘yicha',
    'catalog.found': 'Topildi', 'catalog.more': 'Yana ko‘rsatish', 'catalog.empty': 'Hech narsa topilmadi',
    'catalog.emptyHint': 'Filtrlarni yoki qidiruv so‘rovini o‘zgartirib ko‘ring',
    'loc.suitable': 'Nima uchun mos:', 'loc.amenities': 'Qulayliklar', 'loc.zones': 'Kadrlar va zonalar',
    'loc.allZones': 'Barchasi', 'loc.gallery': 'Galereya', 'loc.addFav': 'Sevimlilarga qo‘shish',
    'loc.inFav': 'Sevimlilarda', 'loc.contact': 'Bog‘lanish', 'loc.similar': 'O‘xshash lokatsiyalar',
    'loc.videoPreview': 'Lokatsiya video-previewsi', 'loc.noPhotos': 'Hozircha foto yo‘q', 'loc.noVideos': 'Hozircha video yo‘q',
    'loc.edit': 'Tahrirlash', 'loc.hidden': 'Yashirilgan', 'loc.share': 'Ulashish', 'loc.copied': 'Havola nusxalandi',
    'loc.notFound': 'Lokatsiya topilmadi',
    'req.title': 'Syomkaga ariza', 'req.name': 'Ismingiz', 'req.phone': 'Telefon', 'req.type': 'Syomka turi',
    'req.date': 'Syomka sanasi', 'req.message': 'Izoh', 'req.send': 'Ariza yuborish',
    'req.sent': 'Ariza yuborildi! Siz bilan bog‘lanamiz.', 'req.choose': 'Tanlanmagan',
    'fav.title': 'Sevimlilar ro‘yxati', 'fav.empty': 'Sevimlilar hozircha bo‘sh',
    'fav.emptyHint': 'Saqlash uchun lokatsiya kartasidagi ♡ ni bosing',
    'fav.guestHint': 'Sevimlilar shu brauzerda saqlanadi. Akkauntda saqlash uchun kiring.',
    'photos.title': 'Lokatsiyalar fotolari', 'videos.title': 'Lokatsiyalar videolari', 'cats.title': 'Kategoriyalar',
    'tags.title': 'Teglar', 'tags.search': 'Teg qidirish...',
    'login.title': 'Kirish', 'login.subtitle': 'REDCRM login va parolingizdan foydalaning', 'login.username': 'Login',
    'login.password': 'Parol', 'login.submit': 'Kirish', 'login.error': 'Login yoki parol noto‘g‘ri',
    'user.login': 'Kirish', 'user.logout': 'Chiqish', 'user.admin': 'Administrator', 'user.user': 'Foydalanuvchi',
    'common.save': 'Saqlash', 'common.cancel': 'Bekor qilish', 'common.delete': 'O‘chirish', 'common.add': 'Qo‘shish',
    'common.edit': 'O‘zgartirish', 'common.close': 'Yopish', 'common.loading': 'Yuklanmoqda...', 'common.back': 'Orqaga',
    'common.error': 'Xatolik', 'common.saved': 'Saqlandi', 'common.deleted': 'O‘chirildi', 'common.yes': 'Ha',
    'common.confirmDelete': 'Butunlay o‘chirilsinmi?', 'common.all': 'Barchasi', 'common.search': 'Qidiruv',
    'notFound.title': 'Sahifa topilmadi', 'notFound.home': 'Bosh sahifaga',
    'access.title': 'Saytga kirish yopiq', 'access.expired': 'Havolangizning amal qilish muddati tugadi.',
    'access.revoked': 'Havola bekor qilingan.', 'access.invalid': 'Havola yaroqsiz.',
    'access.onlyByLink': 'Katalog RED VIDEO GROUP yuborgan shaxsiy havola orqali ochiladi.',
    'access.askManager': 'Menejerdan yangi havola so‘rang.', 'access.staffLogin': 'Xodimlar uchun kirish',
    'access.until': 'Kirish muddati',
    'a.addLocation': 'Lokatsiya qo‘shish', 'a.editLocation': 'Lokatsiyani tahrirlash', 'a.openPage': 'Sahifani ochish',
    'a.mainInfo': 'Asosiy ma’lumot', 'a.name': 'Nomi', 'a.namePlaceholder': 'Masalan: Modern Apartment',
    'a.addressHint': 'Tuman / mo‘ljal', 'a.addressHintHelp': 'Aniq manzil va xaritasiz',
    'a.tagsHint': 'Enter yoki vergul — teg qo‘shish', 'a.tagsPlaceholder': 'Teglar qo‘shing',
    'a.description': 'Tavsif', 'a.descPlaceholder': 'Lokatsiyaning qisqacha tavsifi...',
    'a.amenitiesTitle': 'Qulayliklar va xususiyatlar', 'a.publication': 'Nashr', 'a.published': 'Nashr qilingan',
    'a.featured': 'Mashhur (bosh sahifada)', 'a.badge': 'Belgi', 'a.needCategory': 'Kamida bitta kategoriyani tanlang',
    'a.photos': 'Fotosuratlar', 'a.videos': 'Video', 'a.uploadPhotos': 'Foto yuklang',
    'a.dropHint': 'Fayllarni shu yerga torting yoki tanlang. JPG, PNG, WebP — 25 MB gacha',
    'a.chooseFiles': 'Fayllarni tanlash', 'a.uploading': 'Yuklanmoqda...', 'a.uploaded': 'Yuklandi',
    'a.notUploaded': 'Yuklanmadi', 'a.dragHint': 'Tartibni o‘zgartirish uchun fotolarni torting. Birinchisi — muqova.',
    'a.cover': 'Muqova', 'a.makeCover': 'Muqova qilish', 'a.photo': 'Foto', 'a.caption': 'Izoh',
    'a.zone': 'Zona / kadr', 'a.zonesHint': 'Avval «Kadrlar va zonalar» blokida zonalar qo‘shing',
    'a.saveFirst': 'Video va zonalar qo‘shish uchun lokatsiyani saqlang', 'a.file': 'Fayl', 'a.videoTitle': 'Video nomi',
    'a.videoFile': 'Video fayl', 'a.poster': 'Video muqovasi', 'a.addVideo': 'Video qo‘shish',
    'a.chooseVideo': 'Video faylni tanlang', 'a.youtubeRequired': 'YouTube havolasini kiriting',
    'a.zonesIntro': 'Zonalar kadr topishga yordam beradi: «Divan», «Katta deraza», «G‘isht devor», «Oyna». Ularga foto biriktiring.',
    'a.zoneName': 'Zona nomi', 'a.zonePlaceholder': 'Masalan: Katta deraza', 'a.deleteLocation': 'Lokatsiyani o‘chirish',
    'a.note': 'Menejer izohi...', 'a.noRequests': 'Arizalar yo‘q',
    'status.new': 'Yangi', 'status.in_progress': 'Jarayonda', 'status.done': 'Yakunlangan', 'status.rejected': 'Rad etilgan',
  },
}

const LangContext = createContext(null)
const LANG_KEY = 'redloc_lang'

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) === 'uz' ? 'uz' : 'ru'
    } catch {
      return 'ru'
    }
  })

  const setLang = useCallback((l) => {
    setLangState(l)
    document.documentElement.lang = l
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* private mode */
    }
  }, [])

  const value = useMemo(() => {
    const t = (key) => DICT[lang][key] ?? DICT.ru[key] ?? key
    // Имя из справочника: name_uz с запасным name_ru
    const tn = (obj) => (obj ? (lang === 'uz' && obj.name_uz) || obj.name_ru || obj.name || '' : '')
    const td = (obj) => (obj ? (lang === 'uz' && obj.description_uz) || obj.description_ru || '' : '')
    return { lang, setLang, t, tn, td }
  }, [lang, setLang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
