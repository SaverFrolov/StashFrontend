# Визуальная сверка веб ↔ мобильное приложение (Phase 7)

Чек-лист и точные команды для сверки каждого экрана в обеих темах. Скриншоты складывать в эту папку: `web-<экран>-<тема>.png` и `android-<экран>-<тема>.png`.

## Команды

### Веб (вьюпорт ~390×844 — iPhone-пропорции)

```bash
cd frontend_v2
pnpm --filter @inbox/web dev
# В Chrome/Edge: DevTools (F12) → Device Toolbar (⌘⇧M) → 390×844
# Тема: меню пользователя (аватар) → Тема → Светлая/Тёмная
# Скриншот: ⌘⇧P → "Capture full size screenshot" (или ⌘⇧M-панель → ⋮ → Capture screenshot)
```

### Android (эмулятор)

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# 1. Создать AVD один раз (Pixel-подобное устройство, API 35+):
sdkmanager --install "system-images;android-35;google_apis;arm64-v8a"   # если ещё нет
avdmanager create avd -n stash_test -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_7

# 2. Запустить эмулятор:
emulator -avd stash_test -skin 390x844 &

# 3. Собрать и поставить приложение (debug):
cd apps/mobile
ANDROID_HOME="$HOME/Library/Android/sdk" \
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  npx expo run:android        # или: (cd android && ./gradlew installDebug)

# 4. Скриншоты каждого экрана:
adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png docs/mobile-parity/android-<экран>-<тема>.png

# Тёмная тема на эмуляторе: Settings → Display → Dark theme
# (или: adb shell "cmd uimode night yes" / "cmd uimode night no")
```

### Проверка на старом API (свечение/тени)

```bash
sdkmanager --install "system-images;android-28;default;x86_64"
avdmanager create avd -n stash_old -k "system-images;android-28;default;x86_64" -d pixel
emulator -avd stash_old &
```

## Чек-лист сверки (каждый экран × светлая/тёмная тема)

| # | Экран | Что сравниваем | Статус |
|---|---|---|---|
| 1 | S1 Login | Стеклянная карточка 400dp, аура-фон, зелёная primary-кнопка со свечением | ⬜ |
| 2 | S2 Signup | То же + валидации (имя/email/пароль ≥8) | ⬜ |
| 3 | S3 Reset | Форма → состояние «Проверьте почту» | ⬜ |
| 4 | S4 Inbox | Лента новые снизу, чипы дат с яркой зелёной обводкой, карточки 14dp с отступами, компактный фильтр-бар при скролле ≥80px | ⬜ |
| 5 | S4 Композер | Скрепка/микрофон→Send, чип ссылки, рекордер с level-баром | ⬜ |
| 6 | S5 Детали | 4 слоя, бейдж «ИИ», предупреждение, пунктирные теги, статус-чип → M8 | ⬜ |
| 7 | S6 Поиск | Яркая зелёная рамка ввода, бейджи Keyword/Meaning, подсветка совпадений | ⬜ |
| 8 | S7/S8 Коллекции | Строки-карточки, сортировка, удаление из коллекции | ⬜ |
| 9 | S9 Теги | Счётчики, происхождение, rename/merge/delete | ⬜ |
| 10 | S10 Настройки | 6 разделов, свитч автообработки, токены (reveal-once) | ⬜ |
| 11 | S11 Capture | Fullscreen modal, приём «Поделиться» (отправить текст/файл из другого приложения) | ⬜ |
| 12 | S12 | 404, offline-баннер (выключить сеть на эмуляторе), ErrorBoundary | ⬜ |
| 13 | Тосты | success/error/undo (8с) сверху | ⬜ |
| 14 | Темы | Переключение system/light/dark без мигания при холодном старте | ⬜ |

## Критерии (из ТЗ)

- Нет белых артефактов и дефолтных серых рамок — все hairline зеленоватые, яркие обводки только accent/40
- Нет мигания темы при старте (MMKV читается синхронно до первого рендера)
- Плавный скролл ленты без просадок от blur (blur только шапка/таб-бар/композер/листы)
- Сворачивание фильтр-бара без вспышек и скачков (постоянная высота полосы 52dp)
- Тач-цели ≥44dp (компактный бар ≥32dp)
- Статусы всегда «иконка + текст»
