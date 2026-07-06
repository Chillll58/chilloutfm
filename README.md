<div align="center">

# 🎧 ChilloutFM

### Атмосферное интернет-радио — плеер, плейлист, чат и будильник

Мобильное приложение (PWA + Android APK) для прослушивания онлайн-радиостанции **ChilloutFM**
с живой информацией о треках, историей эфира, живым чатом, голосованием и будильником.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

<br>

### 📲 Скачать приложение

[![Download APK](https://img.shields.io/badge/⬇️_Скачать_APK-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](../../releases/latest)

**[👉 Скачать последнюю версию ChilloutFM для Android](../../releases/latest)**

</div>

---

## ✨ Возможности

### 🎵 Радио (Главная)
- Воспроизведение живого потока ChilloutFM
- Текущий артист, название трека и обложка
- Музыкальный визуализатор — фон пульсирует и переливается в такт
- Регулятор громкости
- Управление с экрана блокировки (Media Session)
- Добавление артиста в избранное ❤️

### 📋 Плейлист
- Что играет сейчас и что будет дальше
- История эфира с временем каждого трека
- Полоска популярности треков
- Лайк трека одним нажатием (голосование)
- Избранные артисты с индикатором «в эфире»

### 💬 Чат
- Живой чат слушателей (сохраняется в базе)
- Реакции-смайлики на сообщения
- Быстрые эмодзи
- Настраиваемое имя
- Режим администратора: удаление сообщений и очистка чата 🛡

### ⏰ Будильник
- Пробуждение под музыку ChilloutFM
- Плавное нарастание громкости
- Функция «отложить» (+10 минут)
- Push-уведомления

### ⭐ Дополнительно
- Push-уведомления, когда любимый артист выходит в эфир
- Устанавливается как приложение (PWA)
- Собирается в Android APK

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
| Источник радио | myradio24.org / поток 8795 |

---

## 🚀 Запуск локально

```bash
# 1. Установить зависимости
npm install

# 2. Создать файл .env (см. .env.example) и указать строку подключения
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# 3. Создать таблицы в базе
npx drizzle-kit push

# 4. Запустить в режиме разработки
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)

---

## ☁️ Деплой на Vercel

1. Залей проект в GitHub (лучше через **GitHub Desktop**)
2. Создай базу данных на [Neon](https://neon.tech) и скопируй `DATABASE_URL`
3. На [Vercel](https://vercel.com) импортируй репозиторий
4. Добавь переменную окружения **`DATABASE_URL`**
5. Нажми **Deploy**

Проверка: `https://твой-сайт.vercel.app/api/health` → `{"ok":true}`

---

## 📱 Сборка Android APK

Проект собирает APK автоматически через **GitHub Actions**:

1. Открой вкладку **Actions**
2. Выбери **Build Android APK (ChilloutFM)**
3. Нажми **Run workflow**
4. Скачай `app-debug.apk` из раздела **Artifacts**

> Адрес приложения берётся из `capacitor.config.ts` (или переменной `CAPACITOR_SERVER_URL`).
> Укажи там свой рабочий Vercel-домен.

---

## 🔑 Переменные окружения

| Переменная | Описание | Обязательна |
|-----------|----------|-------------|
| `DATABASE_URL` | Строка подключения PostgreSQL (Neon) | ✅ Да |
| `CHAT_ADMIN_KEY` | Ключ администратора чата | ❌ Нет (по умолчанию `chillout-admin`) |
| `CAPACITOR_SERVER_URL` | URL сайта для APK | ❌ Нет (берётся из конфига) |

---

## 📂 Структура проекта

```
src/
├── app/
│   ├── api/            # API маршруты
│   │   ├── nowplaying/  # текущий трек + история
│   │   ├── chat/        # чат + админ
│   │   ├── votes/       # голосование за треки
│   │   ├── reactions/   # реакции на сообщения
│   │   └── health/      # проверка состояния
│   ├── layout.tsx
│   └── page.tsx
├── components/         # UI-компоненты (плеер, плейлист, чат, будильник)
├── db/                 # схема и подключение к БД (Drizzle)
└── lib/                # вспомогательные утилиты
android/                # проект Capacitor для сборки APK
public/                 # иконки, манифест, service worker
```

---

## 📻 Источник радио

Поток и метаданные предоставляются платформой **myradio24**:
- Поток: `https://myradio24.org/8795`
- Метаданные: `https://myradio24.org/users/8795/status.json`

---

<div align="center">

Сделано с 💜 для любителей chillout-музыки

**ChilloutFM** • Интернет-радио для настроения

</div>
