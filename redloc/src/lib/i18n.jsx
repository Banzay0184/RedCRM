import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const DICT = {
  ru: {
    'nav.home': 'Главная', 'nav.locations': 'Локации', 'nav.photos': 'Фото', 'nav.videos': 'Видео',
    'nav.settings': 'Настройки',
    'nav.loveStory': 'Love story', 'nav.albums': 'Альбомы', 'common.close': 'Закрыть', 'count.locations': 'локация|локации|локаций', 'site.name': 'RED Video Location', 'site.tagline': 'локации для фото и видео',
    'music.label': 'Музыка', 'music.on': 'Включить музыку', 'music.off': 'Выключить музыку',
    'music.prompt': 'Просмотр сайта сопровождается лёгкой музыкой 🎵', 'music.skip': 'Без музыки',
    'a.order': 'Порядок карточек', 'a.orderHint': 'Перетащите карточки или двигайте стрелками. ТОП всегда показываются первыми, «Не сезон» — последними.',
    'badge.top': 'ТОП', 'badge.hit': 'Хит', 'badge.off_season': 'Не сезон', 'a.badge': 'Метка', 'a.dictChanged': 'Список городов и категорий изменился — выберите заново', 'a.locationGone': 'Эта локация удалена — выберите другую',
    'loc.offSeasonNote': 'Сейчас не сезон для этой локации — уточняйте даты у менеджера.',
    'nav.homeHero': 'Главная', 'a.heroTitle': 'Заголовок', 'a.heroDefaultHint': 'Пустое поле — показывается текст по умолчанию (серым в поле)', 'a.heroSubtitle': 'Подзаголовок', 'a.heroImage': 'Фото баннера',
    'a.heroImageHint': 'Без своего фото показывается фото самой популярной локации', 'a.heroDefault': 'Вернуть фото по умолчанию', 'a.editHero': 'Изменить баннер',
    'a.addPortfolio': 'Добавить съёмку', 'a.editPortfolio': 'Редактировать съёмку', 'a.deletePortfolio': 'Удалить съёмку',
    'a.kind': 'Раздел', 'a.shotDate': 'Дата съёмки', 'a.portfolioPlaceholder': 'Например: Азиз и Малика',
    'portfolio.loveStory.sub': 'Истории пар, снятые нашей командой', 'portfolio.album.sub': 'Свадебные и семейные альбомы',
    'portfolio.empty': 'Пока нет съёмок', 'portfolio.shotAt': 'Снято на локации', 'portfolio.notFound': 'Съёмка не найдена',
    'footer.brand': 'Интеграция для вашего бизнеса',
    'hero.title': 'Локации для фото\nи видео съёмок',
    'hero.subtitle': 'Тысячи уникальных мест для ваших проектов.\nБыстро, удобно, профессионально.',
    'feat.base': 'Большая база\nлокаций', 'feat.verified': 'Только проверенные\nлокации',
    'feat.quality': 'Фото и видео\nв высоком качестве',
    'feat.crm': 'Интеграция с REDCRM\n(проекты, клиенты, заказы)',
    photos: 'фото', videos: 'видео',
    'filters.city': 'Город',
    'catalog.more': 'Показать ещё',
    'loc.noPhotos': 'Фото пока нет', 'loc.noVideos': 'Видео пока нет',
    'loc.edit': 'Редактировать', 'loc.hidden': 'Скрыта',
    'loc.notFound': 'Локация не найдена',
    'photos.title': 'Фото локаций', 'videos.title': 'Видео локаций',
    'login.title': 'Вход', 'login.subtitle': 'Используйте логин и пароль от REDCRM', 'login.username': 'Логин',
    'login.password': 'Пароль', 'login.submit': 'Войти', 'login.error': 'Неверный логин или пароль',
    'user.login': 'Войти', 'user.logout': 'Выйти', 'user.admin': 'Администратор', 'user.user': 'Пользователь',
    'common.save': 'Сохранить', 'common.cancel': 'Отмена', 'common.delete': 'Удалить', 'common.add': 'Добавить',
    'common.saved': 'Сохранено', 'common.deleted': 'Удалено',
    'common.confirmDelete': 'Удалить безвозвратно?',
    'notFound.title': 'Страница не найдена', 'notFound.home': 'На главную',
    'access.title': 'Доступ к сайту закрыт', 'access.expired': 'Срок действия вашей ссылки истёк.',
    'access.revoked': 'Ссылка была отозвана.', 'access.invalid': 'Ссылка недействительна.',
    'access.onlyByLink': 'Каталог доступен по персональной ссылке от RED VIDEO GROUP.',
    'access.askManager': 'Запросите новую ссылку у менеджера.', 'access.staffLogin': 'Вход для сотрудников',
    'access.until': 'Доступ до',
    'a.addLocation': 'Добавить локацию', 'a.editLocation': 'Редактировать локацию', 'a.openPage': 'Открыть страницу',
    'a.mainInfo': 'Основная информация', 'a.name': 'Название', 'a.namePlaceholder': 'Например: Modern Apartment',
    'a.addressHint': 'Район / ориентир', 'a.addressHintHelp': 'Без точного адреса и карты',
    'a.description': 'Описание',
    'a.publication': 'Публикация', 'a.published': 'Опубликована',
    'a.photos': 'Фотографии', 'a.videos': 'Видео', 'a.uploadPhotos': 'Загрузите фото',
    'a.dropHint': 'Перетащите файлы сюда или выберите. JPG, PNG, WebP — до 25 МБ',
    'a.chooseFiles': 'Выбрать файлы', 'a.uploading': 'Загрузка...', 'a.uploaded': 'Загружено',
    'a.notUploaded': 'Не загружено', 'a.dragHint': 'Порядок: перетаскивайте фото или жмите ← →. ★ — сделать обложкой (первое фото).', 'a.moveEarlier': 'Раньше', 'a.moveLater': 'Позже',
    'a.cover': 'Обложка', 'a.makeCover': 'Сделать обложкой', 'a.photo': 'Фото',
    'a.saveFirst': 'Сохраните локацию, чтобы добавить видео и зоны', 'a.file': 'Файл', 'a.videoTitle': 'Название видео',
    'a.videoFile': 'Видеофайл', 'a.poster': 'Обложка видео', 'a.addVideo': 'Добавить видео',
    'a.chooseVideo': 'Выберите видеофайл', 'a.youtubeRequired': 'Вставьте ссылку на YouTube',
    'a.deleteLocation': 'Удалить локацию',
  },
  uz: {
    'nav.home': 'Bosh sahifa', 'nav.locations': 'Lokatsiyalar', 'nav.photos': 'Foto', 'nav.videos': 'Video',
    'nav.settings': 'Sozlamalar',
    'nav.loveStory': 'Love story', 'nav.albums': 'Albomlar', 'common.close': 'Yopish', 'count.locations': 'ta lokatsiya', 'site.name': 'RED Video Location', 'site.tagline': 'foto va video uchun lokatsiyalar',
    'music.label': 'Musiqa', 'music.on': 'Musiqani yoqish', 'music.off': 'Musiqani o‘chirish',
    'music.prompt': 'Saytni ko‘rish yengil musiqa bilan birga 🎵', 'music.skip': 'Musiqasiz',
    'a.order': 'Kartochkalar tartibi', 'a.orderHint': 'Kartochkalarni sudrang yoki strelkalar bilan suring. TOP doim birinchi, «Mavsum emas» — oxirida ko‘rsatiladi.',
    'badge.top': 'TOP', 'badge.hit': 'Xit', 'badge.off_season': 'Mavsum emas', 'a.badge': 'Belgi', 'a.dictChanged': 'Shaharlar va kategoriyalar ro‘yxati o‘zgardi — qaytadan tanlang', 'a.locationGone': 'Bu lokatsiya o‘chirilgan — boshqasini tanlang',
    'loc.offSeasonNote': 'Hozir bu lokatsiya uchun mavsum emas — sanalarni menejerdan aniqlang.',
    'nav.homeHero': 'Bosh sahifa', 'a.heroTitle': 'Sarlavha', 'a.heroDefaultHint': 'Bo‘sh maydon — standart matn ko‘rsatiladi (maydonda kulrang)', 'a.heroSubtitle': 'Qo‘shimcha sarlavha', 'a.heroImage': 'Banner fotosi',
    'a.heroImageHint': 'O‘z fotosi bo‘lmasa, eng mashhur lokatsiya fotosi ko‘rsatiladi', 'a.heroDefault': 'Standart fotoni qaytarish', 'a.editHero': 'Bannerni o‘zgartirish',
    'a.addPortfolio': 'Suratga olish qo‘shish', 'a.editPortfolio': 'Suratga olishni tahrirlash', 'a.deletePortfolio': 'Suratga olishni o‘chirish',
    'a.kind': 'Bo‘lim', 'a.shotDate': 'Suratga olingan sana', 'a.portfolioPlaceholder': 'Masalan: Aziz va Malika',
    'portfolio.loveStory.sub': 'Jamoamiz suratga olgan juftliklar hikoyalari', 'portfolio.album.sub': 'To‘y va oilaviy albomlar',
    'portfolio.empty': 'Hozircha suratga olishlar yo‘q', 'portfolio.shotAt': 'Suratga olingan joy', 'portfolio.notFound': 'Suratga olish topilmadi',
    'footer.brand': 'Biznesingiz uchun integratsiya',
    'hero.title': 'Foto va video syomka\nuchun lokatsiyalar',
    'hero.subtitle': 'Loyihalaringiz uchun minglab noyob joylar.\nTez, qulay, professional.',
    'feat.base': 'Katta lokatsiyalar\nbazasi', 'feat.verified': 'Faqat tekshirilgan\nlokatsiyalar',
    'feat.quality': 'Yuqori sifatli\nfoto va video',
    'feat.crm': 'REDCRM bilan integratsiya\n(loyihalar, mijozlar, buyurtmalar)',
    photos: 'foto', videos: 'video',
    'filters.city': 'Shahar',
    'catalog.more': 'Yana ko‘rsatish',
    'loc.noPhotos': 'Hozircha foto yo‘q', 'loc.noVideos': 'Hozircha video yo‘q',
    'loc.edit': 'Tahrirlash', 'loc.hidden': 'Yashirilgan',
    'loc.notFound': 'Lokatsiya topilmadi',
    'photos.title': 'Lokatsiyalar fotolari', 'videos.title': 'Lokatsiyalar videolari',
    'login.title': 'Kirish', 'login.subtitle': 'REDCRM login va parolingizdan foydalaning', 'login.username': 'Login',
    'login.password': 'Parol', 'login.submit': 'Kirish', 'login.error': 'Login yoki parol noto‘g‘ri',
    'user.login': 'Kirish', 'user.logout': 'Chiqish', 'user.admin': 'Administrator', 'user.user': 'Foydalanuvchi',
    'common.save': 'Saqlash', 'common.cancel': 'Bekor qilish', 'common.delete': 'O‘chirish', 'common.add': 'Qo‘shish',
    'common.saved': 'Saqlandi', 'common.deleted': 'O‘chirildi',
    'common.confirmDelete': 'Butunlay o‘chirilsinmi?',
    'notFound.title': 'Sahifa topilmadi', 'notFound.home': 'Bosh sahifaga',
    'access.title': 'Saytga kirish yopiq', 'access.expired': 'Havolangizning amal qilish muddati tugadi.',
    'access.revoked': 'Havola bekor qilingan.', 'access.invalid': 'Havola yaroqsiz.',
    'access.onlyByLink': 'Katalog RED VIDEO GROUP yuborgan shaxsiy havola orqali ochiladi.',
    'access.askManager': 'Menejerdan yangi havola so‘rang.', 'access.staffLogin': 'Xodimlar uchun kirish',
    'access.until': 'Kirish muddati',
    'a.addLocation': 'Lokatsiya qo‘shish', 'a.editLocation': 'Lokatsiyani tahrirlash', 'a.openPage': 'Sahifani ochish',
    'a.mainInfo': 'Asosiy ma’lumot', 'a.name': 'Nomi', 'a.namePlaceholder': 'Masalan: Modern Apartment',
    'a.addressHint': 'Tuman / mo‘ljal', 'a.addressHintHelp': 'Aniq manzil va xaritasiz',
    'a.description': 'Tavsif',
    'a.publication': 'Nashr', 'a.published': 'Nashr qilingan',
    'a.photos': 'Fotosuratlar', 'a.videos': 'Video', 'a.uploadPhotos': 'Foto yuklang',
    'a.dropHint': 'Fayllarni shu yerga torting yoki tanlang. JPG, PNG, WebP — 25 MB gacha',
    'a.chooseFiles': 'Fayllarni tanlash', 'a.uploading': 'Yuklanmoqda...', 'a.uploaded': 'Yuklandi',
    'a.notUploaded': 'Yuklanmadi', 'a.dragHint': 'Tartib: fotolarni torting yoki ← → bosing. ★ — muqova qilish (birinchi foto).', 'a.moveEarlier': 'Oldinroq', 'a.moveLater': 'Keyinroq',
    'a.cover': 'Muqova', 'a.makeCover': 'Muqova qilish', 'a.photo': 'Foto',
    'a.saveFirst': 'Video va zonalar qo‘shish uchun lokatsiyani saqlang', 'a.file': 'Fayl', 'a.videoTitle': 'Video nomi',
    'a.videoFile': 'Video fayl', 'a.poster': 'Video muqovasi', 'a.addVideo': 'Video qo‘shish',
    'a.chooseVideo': 'Video faylni tanlang', 'a.youtubeRequired': 'YouTube havolasini kiriting',
    'a.deleteLocation': 'Lokatsiyani o‘chirish',
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
  // <html lang> — и при загрузке, и при переключении
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const setLang = useCallback((l) => {
    setLangState(l)
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
    // Число + слово с правильным окончанием: «1 локация / 2 локации / 5 локаций»; в узбекском форма одна
    const tp = (key, n) => {
      const forms = t(key).split('|')
      if (lang !== 'ru' || forms.length < 3) return `${n} ${forms[0]}`
      const m10 = n % 10
      const m100 = n % 100
      const i = m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2
      return `${n} ${forms[i]}`
    }
    // Перевод на конкретном языке (например, подсказка в поле UZ, когда интерфейс на RU)
    const tIn = (l, key) => DICT[l]?.[key] ?? DICT.ru[key] ?? key
    return { lang, setLang, t, tn, td, tp, tIn }
  }, [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}
export const useLang = () => useContext(LangContext)

// Заголовок вкладки: «<страница> — RED Video Location», на главной — название с подписью на текущем языке
export function usePageTitle(part) {
  const { t, lang } = useLang()
  useEffect(() => {
    document.title = part ? `${part} — ${t('site.name')}` : `${t('site.name')} — ${t('site.tagline')}`
  }, [part, lang]) // eslint-disable-line react-hooks/exhaustive-deps
}
