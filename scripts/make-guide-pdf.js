/* Генерация PDF-инструкции для ChilloutFM */
const PDFDocument = require("pdfkit");
const fs = require("fs");

const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FONT_M = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf";

const OUT = "public/download/ChilloutFM-instrukciya.pdf";
fs.mkdirSync("public/download", { recursive: true });

const doc = new PDFDocument({ size: "A4", margin: 50 });
doc.pipe(fs.createWriteStream(OUT));

doc.registerFont("r", FONT);
doc.registerFont("b", FONT_B);
doc.registerFont("m", FONT_M);

const PINK = "#d6336c";
const NAVY = "#0b1020";
const GRAY = "#555";
const LIGHT = "#888";

function h1(t) {
  if (doc.y > 700) doc.addPage();
  doc.moveDown(0.5);
  doc.font("b").fontSize(18).fillColor(PINK).text(t);
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#eee").stroke();
  doc.moveDown(0.5);
}
function h2(t) {
  if (doc.y > 720) doc.addPage();
  doc.moveDown(0.4);
  doc.font("b").fontSize(13).fillColor(NAVY).text(t);
  doc.moveDown(0.2);
}
function p(t) {
  if (doc.y > 760) doc.addPage();
  doc.font("r").fontSize(10.5).fillColor("#222").text(t, { lineGap: 2 });
}
function li(t) {
  if (doc.y > 760) doc.addPage();
  doc.font("r").fontSize(10.5).fillColor("#222").text("•  " + t, { indent: 8, lineGap: 2 });
}
function step(n, t) {
  if (doc.y > 750) doc.addPage();
  doc.moveDown(0.2);
  doc.font("b").fontSize(11).fillColor(PINK).text(`Шаг ${n}. `, { continued: true });
  doc.font("r").fillColor("#222").text(t, { lineGap: 2 });
}
function code(t) {
  if (doc.y > 740) doc.addPage();
  const h = t.split("\n").length * 13 + 10;
  const y = doc.y;
  doc.rect(50, y, 495, h).fill("#f4f4f7");
  doc.font("m").fontSize(9).fillColor("#1a1a2e").text(t, 58, y + 6, { width: 480, lineGap: 2 });
  doc.y = y + h + 4;
  doc.fillColor("#222");
}
function note(t) {
  if (doc.y > 730) doc.addPage();
  const y = doc.y;
  const height = doc.heightOfString(t, { width: 470 }) + 14;
  doc.rect(50, y, 495, height).fillAndStroke("#fff6e5", "#f0c36d");
  doc.font("r").fontSize(9.5).fillColor("#7a5c00").text("⚠  " + t, 60, y + 7, { width: 470 });
  doc.y = y + height + 4;
  doc.fillColor("#222");
}
function space() { doc.moveDown(0.5); }

/* ---------- ОБЛОЖКА ---------- */
doc.rect(0, 0, 595, 842).fill(NAVY);
doc.font("b").fontSize(40).fillColor("#ffffff").text("ChilloutFM", 0, 250, { align: "center" });
doc.font("r").fontSize(15).fillColor("#5eead4").text("Полная инструкция по запуску", { align: "center" });
doc.moveDown(0.5);
doc.font("r").fontSize(11).fillColor("#93a4c3").text("Радио • Знакомства Chill.Love • Трансляции • Оплаты", { align: "center" });
doc.moveDown(3);
doc.font("r").fontSize(10).fillColor("#93a4c3").text("Пошаговое руководство для новичка", { align: "center" });
doc.addPage();

/* ---------- СОДЕРЖАНИЕ ---------- */
h1("Содержание");
[
  "1. Что вам понадобится",
  "2. Установка программ (Node.js, Git, GitHub Desktop)",
  "3. Аккаунты (GitHub, Vercel, Neon)",
  "4. Загрузка проекта в GitHub",
  "5. База данных Neon",
  "6. Деплой на Vercel",
  "7. Переменные окружения (все ключи)",
  "8. Вход через VK",
  "9. Оплаты YooMoney и админка",
  "10. Видео-трансляции (LiveKit)",
  "11. Сборка APK для Android",
  "12. Обновление приложения",
  "13. Ключи и пароли (сводка)",
  "14. Если что-то не работает",
].forEach(li);

/* ---------- 1 ---------- */
h1("1. Что вам понадобится");
li("Компьютер с интернетом");
li("Электронная почта");
li("Телефон Android (для установки APK)");
li("30–60 минут времени");
space();
p("Все сервисы, которые мы используем, имеют бесплатные тарифы. Платить ни за что не нужно для запуска.");

/* ---------- 2 ---------- */
h1("2. Установка программ");
h2("2.1 Node.js");
step(1, "Откройте сайт nodejs.org");
step(2, "Скачайте версию LTS и установите (кнопка Далее везде)");
step(3, "Проверьте в терминале:");
code("node -v\nnpm -v");
h2("2.2 Git");
step(1, "Откройте git-scm.com/downloads, скачайте и установите");
step(2, "Проверьте:");
code("git --version");
h2("2.3 GitHub Desktop (главный инструмент)");
p("Это программа с кнопками для загрузки кода на GitHub без командной строки.");
step(1, "Откройте desktop.github.com");
step(2, "Скачайте, установите, войдите через свой GitHub-аккаунт");
note("Всегда загружайте файлы через GitHub Desktop, а не через сайт. Иначе картинки и папки портятся.");

/* ---------- 3 ---------- */
h1("3. Создание аккаунтов");
h2("3.1 GitHub — хранилище кода");
li("Откройте github.com → Sign up → подтвердите email");
h2("3.2 Vercel — хостинг сайта");
li("Откройте vercel.com → войдите через GitHub");
h2("3.3 Neon — база данных");
li("Откройте neon.tech → войдите через GitHub → создайте проект");
li("Скопируйте строку подключения (Connection string) вида:");
code("postgresql://user:password@host/dbname?sslmode=require");
note("Сохраните эту строку — это ваш DATABASE_URL, он понадобится в Vercel.");

/* ---------- 4 ---------- */
h1("4. Загрузка проекта в GitHub");
step(1, "Скачайте архив проекта (chilloutfm-project.zip) и распакуйте его в отдельную папку");
step(2, "Откройте GitHub Desktop → File → Add local repository → выберите папку");
step(3, "Если просит — нажмите 'create a repository'");
step(4, "Внизу впишите Summary (например 'проект') → Commit to main");
step(5, "Вверху нажмите Publish repository");
p("Имя репозитория, например: chilloutfm. Галочку 'Keep private' можно снять, если хотите публичный.");
note("Если имя занято — назовите иначе (chilloutfm-app). Следите, чтобы имя было без опечаток.");

/* ---------- 5 ---------- */
h1("5. База данных Neon");
p("Таблицы создаются автоматически при первом обращении (самовосстановление). Обычно ничего вручную делать не нужно.");
p("Если хотите создать таблицы заранее — в папке проекта:");
code("npm install\nnpx drizzle-kit push");
p("(перед этим создайте файл .env со строкой DATABASE_URL из Neon)");

/* ---------- 6 ---------- */
h1("6. Деплой на Vercel");
step(1, "Откройте vercel.com/new");
step(2, "Выберите свой репозиторий → Import");
step(3, "Vercel сам определит Next.js — ничего не меняйте");
step(4, "В разделе Environment Variables добавьте DATABASE_URL (см. раздел 7)");
step(5, "Нажмите Deploy и подождите 1–2 минуты");
p("После сборки получите адрес вида: https://ваш-проект.vercel.app");
h2("Проверка");
p("Откройте в браузере: https://ваш-проект.vercel.app/api/health");
p("Должно показать: {\"ok\":true}");
note("Держите только ОДИН проект в Vercel. Лишние проекты удаляйте, чтобы не путаться с доменами.");

/* ---------- 7 ---------- */
h1("7. Переменные окружения");
p("Vercel → ваш проект → Settings → Environment Variables. Добавляйте по одной, отмечайте Production, Preview, Development, затем Save и Redeploy.");
space();
h2("Обязательные");
li("DATABASE_URL — строка подключения из Neon");
space();
h2("Знакомства / оплаты");
li("DATING_ADMIN_KEY — ваш секретный ключ админки Chill.Love");
li("YOOMONEY_WALLET — номер вашего кошелька YooMoney");
li("YOOMONEY_NOTIFY_SECRET — секрет HTTP-уведомлений YooMoney");
li("PREMIUM_CODE — резервный код премиума (например CHILL-PREMIUM)");
li("CHAT_ADMIN_KEY — ключ администратора общего чата радио");
space();
h2("Вход через VK");
li("VK_APP_ID — ID приложения VK");
li("APP_BASE_URL — https://ваш-проект.vercel.app");
space();
h2("Видео-трансляции (LiveKit)");
li("NEXT_PUBLIC_LIVEKIT_URL — wss://ваш-проект.livekit.cloud");
li("LIVEKIT_API_KEY — ключ LiveKit");
li("LIVEKIT_API_SECRET — секрет LiveKit");
space();
h2("SMS/Email коды (по желанию)");
li("SMS_API_KEY — ключ SMS-шлюза (SMSC/Twilio)");
li("EMAIL_API_KEY — ключ почтовой рассылки");

/* ---------- 8 ---------- */
h1("8. Вход через VK (VK ID)");
step(1, "Откройте dev.vk.com → создайте приложение (тип 'Веб-сайт')");
step(2, "В настройках укажите:");
li("Базовый домен: ваш-проект.vercel.app");
li("Доверенный Redirect URL: https://ваш-проект.vercel.app/api/vk/oauth");
step(3, "Скопируйте ID приложения → в Vercel как VK_APP_ID");
step(4, "APP_BASE_URL = https://ваш-проект.vercel.app");
step(5, "Redeploy");
note("Используется новая система VK ID. Обязательно нажмите 'Сохранить' в настройках VK.");

/* ---------- 9 ---------- */
h1("9. Оплаты YooMoney и админка");
h2("9.1 Приём платежей");
step(1, "Заведите кошелёк на yoomoney.ru");
step(2, "Номер кошелька → в Vercel как YOOMONEY_WALLET");
step(3, "YooMoney → Настройки → HTTP-уведомления:");
code("https://ваш-проект.vercel.app/api/dating/pay/notify");
step(4, "Секрет уведомлений → в Vercel как YOOMONEY_NOTIFY_SECRET");
h2("9.2 Админка Chill.Love");
p("Откройте вкладку Chill.Love → вверху кнопка 🛡 Админ → введите DATING_ADMIN_KEY.");
li("Сводка: сколько получено, ваша прибыль, к выплате");
li("Платежи: кто, сколько, когда");
li("Выплаты: баланс каждого исполнителя + кнопка 'Выплатить'");
note("Кнопка 'Выплатить' только фиксирует выплату. Сами деньги вы переводите вручную через YooMoney. Автовыплаты требуют юрлица и YooKassa.");
note("ВАЖНО про закон: приём платежей за интим-контент нарушает правила YooMoney и может привести к блокировке. Ответственность за легальность на вас (юрлицо, оферта, налоги).");

/* ---------- 10 ---------- */
h1("10. Видео-трансляции (LiveKit)");
p("Без LiveKit трансляции работают в демо-режиме (фото + чат). Для реального видео:");
step(1, "Зарегистрируйтесь на cloud.livekit.io (бесплатный тариф)");
step(2, "Создайте проект — получите URL, API Key, API Secret");
step(3, "Добавьте в Vercel:");
li("NEXT_PUBLIC_LIVEKIT_URL = wss://...livekit.cloud");
li("LIVEKIT_API_KEY = ключ");
li("LIVEKIT_API_SECRET = секрет");
step(4, "Redeploy");

/* ---------- 11 ---------- */
h1("11. Сборка APK для Android");
step(1, "GitHub → ваш репозиторий → вкладка Actions");
step(2, "Слева выберите 'Build Android APK (ChilloutFM)'");
step(3, "Справа Run workflow → Run workflow");
step(4, "Дождитесь зелёной галочки");
step(5, "Готовый APK появится в разделе Releases (файл app-debug.apk)");
note("Адрес приложения для APK берётся из файла capacitor.config.ts. Укажите там ваш рабочий адрес Vercel.");
h2("Установка на телефон");
li("Скачайте APK → откройте на телефоне");
li("Разрешите 'Установка из этого источника' → Установить");

/* ---------- 12 ---------- */
h1("12. Обновление приложения");
p("Когда меняете код или скачали новый архив:");
step(1, "Замените файлы в папке проекта");
step(2, "GitHub Desktop → Commit to main → Push origin");
step(3, "Vercel обновит сайт сам за 1–2 минуты");
p("APK пересобирать НЕ нужно (кроме смены иконки/названия/разрешений).");
h2("Сброс кеша на телефоне");
li("Настройки → Приложения → ChilloutFM → Хранилище → Очистить кеш");
li("Закройте приложение полностью и откройте заново");

/* ---------- 13 ---------- */
h1("13. Ключи и пароли (запишите свои)");
p("Заполните и храните в надёжном месте:");
space();
const rows = [
  "DATABASE_URL (Neon): _______________________________",
  "Адрес Vercel: https://______________________.vercel.app",
  "DATING_ADMIN_KEY (админка): ________________________",
  "CHAT_ADMIN_KEY (чат радио): ________________________",
  "PREMIUM_CODE: ______________________________________",
  "YOOMONEY_WALLET: ___________________________________",
  "VK_APP_ID: _________________________________________",
  "LiveKit URL/Key/Secret: ____________________________",
];
rows.forEach((r) => { doc.font("m").fontSize(9.5).fillColor("#222").text(r, { lineGap: 6 }); });
note("Значения по умолчанию (если не задали свои): админ-ключ = chillout-admin, премиум-код = CHILL-PREMIUM. Обязательно смените их!");

/* ---------- 14 ---------- */
h1("14. Если что-то не работает");
const faq = [
  ["Сайт: /api/health не {\"ok\":true}", "Проверьте DATABASE_URL в Vercel"],
  ["Vercel: repository can't be found", "Settings → Git → Reconnect, выберите правильный репозиторий"],
  ["VK вход: Security Error", "Проверьте Redirect URL в VK и APP_BASE_URL"],
  ["APK: 404 NOT_FOUND", "В capacitor.config.ts неверный адрес Vercel"],
  ["В приложении старая версия", "Очистите кеш приложения, откройте заново"],
  ["Оплата не даёт эффект", "Проверьте HTTP-уведомления YooMoney и секрет"],
  ["Видео не идёт зрителям", "Нужен LiveKit (см. раздел 10)"],
];
faq.forEach(([q, a]) => {
  if (doc.y > 740) doc.addPage();
  doc.font("b").fontSize(10).fillColor(NAVY).text("• " + q);
  doc.font("r").fontSize(10).fillColor(GRAY).text("   → " + a, { lineGap: 3 });
});

space(); space();
doc.font("r").fontSize(9).fillColor(LIGHT).text("ChilloutFM — сделано с любовью. Храните этот файл, чтобы не потерять настройки.", { align: "center" });

doc.end();
console.log("PDF готов:", OUT);
