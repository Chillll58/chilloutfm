<div align="center">

<img src="public/icons/icon-192.png" alt="ChilloutFM" width="120" height="120" style="border-radius:28px" />

# 🎧 ChilloutFM

### Атмосферное интернет-радио в твоём телефоне

Радио, музыкальные новинки и новости, живой чат, будильник и уютное комьюнити —
всё в одном приложении. Слушай, общайся, засыпай под любимые треки. 🌙

<br>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Android](https://img.shields.io/badge/Android-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)

<br>

### 📲 Скачать и документы

[![Download APK](https://img.shields.io/badge/⬇️_Скачать_APK-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](../../releases/latest)
[![Инструкция PDF](https://img.shields.io/badge/📄_Инструкция-PDF-EF4444?style=for-the-badge)](public/download/ChilloutFM-instrukciya.pdf)

**[👉 Последняя версия для Android](../../releases/latest)** · **[📖 Инструкция по запуску (PDF)](public/download/ChilloutFM-instrukciya.pdf)**

</div>

---

## ✨ Возможности

### 🎧 Радио
- Живой поток ChilloutFM с обложкой, артистом и названием трека
- Музыкальный визуализатор — фон пульсирует в такт
- Управление с экрана блокировки (Media Session), поддержка Hyper Island (Xiaomi)
- Работа в фоне с авто-переподключением потока
- ❤️ Избранное станции (синхронизация с myradio24)

### 📋 Плейлист
- Что играет сейчас, далее и полная история эфира со временем
- Полоска популярности, лайки треков ❤️
- ⭐ Избранные артисты
- 🔍 Поиск на YouTube и ВК, ⬇️ скачивание (для премиум)

### 📰 Новости Chill
- 🎵 Музыкальные новинки из интернета с прослушиванием превью
- 📰 Новости музыки на русском (авто-перевод, с картинками, «Читать далее»)
- 📢 Автолента из сообщества ВК (посты + фото + аудио)
- 🎙 Ведущие радио с контактами
- 🗓 Программа передач

### 💬 Чат
- Живой чат слушателей
- Ответы на сообщения, реакции, 250+ эмодзи
- 🎤 Голосовые, 📷 фото/видео с камеры, 🖼️ файлы, 🎵 музыка
- 🛡 Режим администратора (модерация, очистка)

### ⏰ Будильник
- Пробуждение под музыку, плавное нарастание громкости
- Функция «отложить», 😴 таймер сна (до 2 часов)
- Нативные уведомления (срабатывают при закрытом приложении)

### 📬 Контакты
- 🔄 Проверка обновлений + автоуведомление о новой версии
- ☕ Донат «Админу на кофе» (ЮMoney)
- ✉️ Обратная связь прямо в приложении (с ответами от админа)
- 🔴 Бейдж при новом ответе
- 📄 Политика конфиденциальности и документы для правообладателей

### 👑 Премиум
- Активация по коду или VK ID (с подсказкой)
- Поддержка через VK Donut
- Звук высокого качества, скачивание треков, корона в чате

### 🎨 Оформление
- 🌗 Тёмная и светлая темы
- 📱 Адаптивная вёрстка под любой экран + ландшафт

---

## 🛠 Технологии

| Слой | Технология |
|------|------------|
| Фронтенд | Next.js 16 (App Router), React 19, TypeScript |
| Стили | Tailwind CSS 4 |
| База данных | PostgreSQL + Drizzle ORM |
| Хостинг | Vercel · БД: Neon |
| Мобильная обёртка | Capacitor (Android) |
| Радио | myradio24.org · поток 8795 |
| Новости | Mixmag/DJ Mag RSS + iTunes + VK API |
| Оплаты | ЮMoney · Почта: SMTP (Mail.ru) |

---

## 🚀 Запуск локально

\`\`\`bash
npm install
# создайте .env со строкой DATABASE_URL (см. .env.example)
npx drizzle-kit push
npm run dev
\`\`\`

Откройте [http://localhost:3000](http://localhost:3000)

---

## ☁️ Деплой

Подробная инструкция — в [\`DEPLOY.md\`](DEPLOY.md) и [PDF](public/download/ChilloutFM-instrukciya.pdf).

1. Залейте проект в GitHub (через GitHub Desktop)
2. Создайте базу на [Neon](https://neon.tech)
3. Импортируйте в [Vercel](https://vercel.com), добавьте переменные окружения
4. **Deploy**

Проверка: \`https://ваш-сайт.vercel.app/api/health\` → \`{"ok":true}\`

---

## 📱 Сборка APK

APK собирается автоматически через **GitHub Actions**:
**Actions → Build Android APK (ChilloutFM) → Run workflow** → готовый \`.apk\` в разделе **Releases**.

---

## 🔑 Переменные окружения

| Переменная | Назначение |
|-----------|------------|
| \`DATABASE_URL\` | PostgreSQL (Neon) |
| \`VK_SERVICE_TOKEN\` | Автолента постов из сообщества ВК |
| \`VK_APP_ID\`, \`APP_BASE_URL\` | Вход через VK (опционально) |
| \`SMTP_HOST/PORT/USER/PASS\` | Отправка почты обратной связи |
| \`SUPPORT_EMAIL\` | Адрес получения обращений |
| \`DATING_ADMIN_KEY\` | Ключ администратора |
| \`PREMIUM_CODE\` | Код активации премиума |

---

## 📂 Структура проекта

\`\`\`
src/
├── app/api/          # API: nowplaying, chat, news (vk/music/articles),
│                     #      feedback, premium, update, vk (oauth), health
├── components/       # UI: плеер, плейлист, новости, чат, будильник,
│                     #     контакты, админ-панель
├── lib/              # утилиты (clientId, premium, media, nativeAlarm…)
db/                   # схема и подключение (Drizzle)
android/              # проект Capacitor для APK + виджет
public/               # иконки, манифест, service worker, промо, PDF
\`\`\`

---

## 📻 Источники данных

- Радио-поток: \`https://myradio24.org/8795\`
- Метаданные: \`https://myradio24.org/users/8795/status.json\`
- Новости: Mixmag, DJ Mag (RSS), iTunes, VK API
- Сообщество: [vk.com/chillou_fm](https://vk.com/chillou_fm)

---

<div align="center">

Сделано с 💜 для любителей chillout-музыки

**ChilloutFM** • Интернет-радио для настроения 🎧

[⬇️ Скачать APK](../../releases/latest) · [🌐 Сайт](https://chilloutfm.vercel.app) · [💬 ВК](https://vk.com/chillou_fm)

</div>
