# ChilloutFM — полная инструкция по деплою

Приложение: интернет-радио с плеером, плейлистом, чатом, будильником,
премиум-подпиской (VK Donut), входом через VK и Android APK.

---

## 1. Залить код в GitHub (через GitHub Desktop)

1. Распакуй архив в папку.
2. GitHub Desktop → **File → Add local repository** → выбери папку.
3. Если просит — **create a repository**.
4. **Commit to main** → **Publish repository** (или Push).

Репозиторий (пример): `Chillll58/chilloutfm`
> Внимание: имя должно совпадать везде без опечаток.

---

## 2. База данных (Neon)

1. https://neon.tech → создай проект.
2. Скопируй Connection string: `postgresql://...sslmode=require`
3. Таблицы создаются автоматически при первом запросе (self-healing),
   либо локально: `npx drizzle-kit push`.

---

## 3. Деплой на Vercel

1. https://vercel.com/new → Import репозиторий `chilloutfm`.
2. Добавь Environment Variables (см. раздел 5).
3. **Deploy**.

Проверка: `https://ТВОЙ-САЙТ.vercel.app/api/health` → `{"ok":true}`

---

## 4. Обновление приложения

1. Меняешь файлы → GitHub Desktop → **Commit** → **Push**.
2. Vercel пересобирает сам.
3. APK пересобирать НЕ нужно (кроме иконки/названия/разрешений/виджета).

---

## 5. Переменные окружения (Vercel → Settings → Environment Variables)

| Ключ | Значение | Нужно для |
|------|----------|-----------|
| `DATABASE_URL` | строка Neon | база (чат, голоса, премиум) |
| `PREMIUM_CODE` | напр. `CHILL-PREMIUM` | резервный код премиума |
| `CHAT_ADMIN_KEY` | свой пароль | админ чата |
| `VK_APP_ID` | ID VK-приложения | вход через VK |
| `VK_APP_SECRET` | защищённый ключ VK | вход через VK (опц. при PKCE) |
| `APP_BASE_URL` | `https://ТВОЙ-САЙТ.vercel.app` | вход через VK |
| `VK_CONFIRMATION_CODE` | строка из VK Callback API | авто-премиум |
| `VK_SECRET` | секрет VK Callback | авто-премиум (опц.) |

После добавления → **Redeploy**.

---

## 6. Вход через VK (VK ID)

1. https://dev.vk.com → создай приложение (тип «Веб-сайт»).
2. В настройках приложения:
   - Базовый домен: `ТВОЙ-САЙТ.vercel.app`
   - Доверенный Redirect URL: `https://ТВОЙ-САЙТ.vercel.app/api/vk/oauth`
3. Скопируй **ID приложения** → `VK_APP_ID` в Vercel.
4. Redeploy.

Используется новый протокол VK ID (id.vk.com) с PKCE.

---

## 7. Авто-премиум после доната (VK Donut)

1. VK сообщество → Управление → Работа с API → **Callback API**.
2. URL: `https://ТВОЙ-САЙТ.vercel.app/api/vk/callback`
3. Строку подтверждения → `VK_CONFIRMATION_CODE` в Vercel → Redeploy → «Подтвердить» в VK.
4. Включи типы событий Donut (создание/продление/истечение/отмена).

Донат → VK шлёт событие → премиум активируется автоматически.

---

## 8. Сборка APK (GitHub Actions)

1. GitHub → **Actions** → **Build Android APK (ChilloutFM)** → **Run workflow**.
2. APK автоматически публикуется в **Releases** (тег latest).
3. Адрес приложения берётся из `capacitor.config.ts`
   (или переменной `CAPACITOR_SERVER_URL`).

---

## Возможности приложения

- 🎵 Радио: 128 kbps (обычный) / 320 kbps (премиум)
- 📋 Плейлист: история, лайки, популярность, поиск на YouTube/ВК
- 💬 Чат: ответы, реакции, эмодзи, голосовые, фото/видео/файлы
- 👑 Премиум-комната + корона
- ⏰ Будильник + таймер сна
- 🌗 Тёмная/светлая тема
- 📱 Адаптив + ландшафт
- 🔵 Вход через VK, авто-премиум через VK Donut
- 🎛️ Android: виджет, разрешения, Hyper Island (MediaSession)
