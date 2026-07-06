# ChilloutFM APK build

Проект подготовлен под Android-обёртку через Capacitor.

## Вариант 1 — через GitHub Actions

После того как этот проект загружен в GitHub, в репозитории появится workflow:

- **Actions**
- **Build Android APK (ChilloutFM)**
- **Run workflow**

### Как собрать APK

1. Открой вкладку **Actions** в GitHub-репозитории.
2. Слева выбери **Build Android APK (ChilloutFM)**.
3. Справа нажми **Run workflow**.
4. После завершения открой запуск workflow.
5. Внизу в блоке **Artifacts** скачай архив **chilloutfm-debug-apk**.
6. Внутри архива будет файл:

```text
app-debug.apk
```

### Если workflow не виден

Проверь:

1. Файл `.github/workflows/build-android-apk.yml` запушен в ветку `main`
2. Ты открыл именно **репозиторий**, а не профиль GitHub
3. В репозитории включены **Actions**
4. После пуша обнови страницу **Actions**

---

## Вариант 2 — локально через Android Studio

## 1. Указать URL приложения

По умолчанию в `capacitor.config.ts` уже стоит текущий адрес приложения.
При необходимости можно переопределить его так:

```bash
export CAPACITOR_SERVER_URL="https://your-domain.example"
```

## 2. Создать/обновить Android-проект

```bash
npx cap sync android
```

## 3. Собрать APK

Нужен установленный Android Studio / Android SDK.

```bash
cd android
./gradlew assembleDebug
```

Готовый APK будет здесь:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 4. Release-сборка

```bash
cd android
./gradlew assembleRelease
```

---

## Вариант 3 — PWABuilder

Можно сгенерировать APK ещё быстрее через:

- https://www.pwabuilder.com/

Просто вставь URL приложения.
