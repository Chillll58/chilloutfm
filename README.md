<div align="center">

<img src="public/icons/icon-192.png" alt="ChilloutFM" width="120" height="120" style="border-radius:28px" />

# 🎧 ChilloutFM

### Атмосферное интернет-радио в твоём телефоне

Расслабляющая музыка, живой эфир, уютное комьюнити и премиум-возможности —
всё в одном приложении. Слушай, общайся, засыпай под любимые треки. 🌙

<br>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Android](https://img.shields.io/badge/Android-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)

<br>

### 📲 Скачать приложение

[![Download APK](https://img.shields.io/badge/⬇️_Скачать_APK-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](../../releases/latest)

**[👉 Последняя версия ChilloutFM для Android](../../releases/latest)**

</div>

---

## ✨ Возможности

### 🎵 Радио
- Живой поток ChilloutFM с обложкой, артистом и названием трека
- **Музыкальный визуализатор** — фон пульсирует и переливается в такт
- Управление с экрана блокировки (Media Session)
- Поддержка **Hyper Island** на Xiaomi/Redmi
- Работа в фоне с авто-переподключением
- Два качества звука: **128 kbps** (обычный) / **320 kbps** (премиум)

### 📋 Плейлист
- Что играет сейчас, что дальше и полная история эфира со временем
- Полоска популярности треков
- ❤️ Лайки треков одним нажатием
- ⭐ Избранные артисты с индикатором «в эфире»
- 🔍 Поиск любого трека на **YouTube** и **ВКонтакте**

### 💬 Чат
- Живой чат слушателей с сохранением в базе
- 💬 Ответы на сообщения (цитирование)
- 😊 250+ эмодзи по категориям
- 😀 Реакции на сообщения
- 🎤 Голосовые сообщения с микрофона
- 📷 Фото и видео с камеры
- 🖼️ Картинки, 🎵 музыка, 📎 файлы из галереи
- 🛡 Режим администратора (модерация, очистка)

### 👑 Премиум
- Автоматическая активация после поддержки через **VK Donut**
- Вход через **VK ID** (OAuth)
- Золотая корона 👑 в чате
- Закрытая **премиум-комната**
- Скачивание треков в высоком качестве
- Звук 320 kbps

### ⏰ Будильник и сон
- Пробуждение под музыку ChilloutFM
- Плавное нарастание громкости
- Функция «отложить» (+10 минут)
- 😴 **Таймер сна** — музыка сама выключится (засыпай спокойно)

### 🎨 Оформление
- 🌗 Тёмная и светлая темы
- 📱 Полностью адаптивная вёрстка (любой размер экрана)
- 🔄 Ландшафтный режим для планшетов и телефонов

---

## 🛠 Технологии

| Слой | Технология |
|------|------------|
| Фронтенд | Next.js 16 (App Router), React 19, TypeScript |
| Стили | Tailwind CSS 4 |
| База данных | PostgreSQL + Drizzle ORM |
| Хостинг | Vercel |
| БД-хостинг | Neon |
| Мобильная обёртка | Capacitor (Android) |
| Авторизация | VK ID (OAuth 2.0 + PKCE) |
| Платежи | VK Donut (Callback API) |
| Источник радио | myradio24.org · поток 8795 |

---

## 🚀 Запуск локально

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env (см. .env.example)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# 3. Создать таблицы
npx drizzle-kit push

# 4. Запустить
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)

---

## ☁️ Деплой

Полная инструкция — в файле [`DEPLOY.md`](DEPLOY.md).

Кратко:
1. Залей проект в GitHub (через GitHub Desktop)
2. Создай базу на [Neon](https://neon.tech)
3. Импортируй в [Vercel](https://vercel.com), добавь `DATABASE_URL`
4. **Deploy**

Проверка: `https://твой-сайт.vercel.app/api/health` → `{"ok":true}`

---

## 📱 Сборка Android APK

APK собирается автоматически через **GitHub Actions**:

1. Вкладка **Actions** → **Build Android APK (ChilloutFM)**
2. **Run workflow**
3. Готовый `.apk` появится в разделе **Releases**

---

## 🔑 Переменные окружения

| Переменная | Описание |
|-----------|----------|
| `DATABASE_URL` | Подключение PostgreSQL (Neon) |
| `PREMIUM_CODE` | Резервный код премиума |
| `CHAT_ADMIN_KEY` | Ключ администратора чата |
| `VK_APP_ID` | ID приложения VK (вход) |
| `APP_BASE_URL` | Адрес сайта для VK-редиректа |
| `VK_CONFIRMATION_CODE` | Подтверждение VK Callback API |

---

## 📂 Структура проекта

```
src/
├── app/
│   ├── api/            # API маршруты
│   │   ├── nowplaying/  # текущий трек + история
│   │   ├── chat/        # чат + админ
│   │   ├── votes/       # лайки треков
│   │   ├── reactions/   # реакции на сообщения
│   │   ├── premium/     # активация премиума
│   │   ├── vk/          # VK OAuth + Donut callback
│   │   └── health/      # проверка состояния
│   ├── layout.tsx
│   └── page.tsx
├── components/         # UI (плеер, плейлист, чат, будильник, премиум)
├── db/                 # схема и подключение (Drizzle)
└── lib/                # утилиты
android/                # проект Capacitor для APK + виджет
public/                 # иконки, манифест, service worker
```

---

## 📻 Источник радио

Поток и метаданные — платформа **myradio24**:
- Поток: `https://myradio24.org/8795`
- Метаданные: `https://myradio24.org/users/8795/status.json`

---

<div align="center">

Сделано с 💜 для любителей chillout-музыки

**ChilloutFM** • Интернет-радио для настроения 🎧

[⬇️ Скачать APK](../../releases/latest) · [🌐 Открыть сайт](http://chilloutfm.ru/)

</div>
