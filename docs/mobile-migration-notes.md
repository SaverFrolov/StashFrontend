# Mobile migration notes — зафиксированные решения и допущения

Живой документ: сюда попадают решения, не оговорённые в ТЗ/спецификации, и отклонения «веб → мобильный». План — в `docs/mobile-migration-plan.md`.

## Фаза 2 (фундамент)

- **MMKV v4** (Nitro): API отличается от v2/v3 — `createMMKV({ id })`, методы `set(key, value)` / `getString(key)` / `remove(key)` (не `delete`). Обёртка `StorageAdapter` для MockApi — в `apps/mobile/src/storage.ts`.
- **Tailwind/NativeWind**: NativeWind используется только для layout/spacing (`className="flex-1 items-center gap-2"`). Все цвета — из TS-токенов `@inbox/ui-core` через ThemeProvider и inline-стили. Причина: формат `rgb(var(--x-rgb)/α)` и CSS-переменные в NativeWind ненадёжны (риск #1 плана). На веб при этом найден и исправлен корневой баг opacity-модификаторов (коммит 21a2dd0) — для RN chosen путь проще и устойчивее.
- **TypeScript 6** в мобильном workspace: `baseUrl` объявлен deprecated → `paths` работают без него (относительно расположения tsconfig).
- **Конфликт @types/react 18/19**: web-пакеты (React 18) и mobile (React 19.3) живут в одном монорепозитории; hoisted `@types/react@19` ломал JSX-типы lucide-react в `packages/ui`. Решение: pin через `paths` в tsconfig ui/web/extension на свои `./node_modules/@types/react`.
- **Шрифты**: статические Inter_400Regular/500Medium/600SemiBold через `@expo-google-fonts/inter` + `useFonts` + splash gating (веб использует Inter Variable; в RN статические лица — стандартный подход, визуальная разница минимальна).
- **Blur на Android**: `experimentalBlurMethod="none"` (настоящий blur дорог) + компенсирующий зелёный tint-оверлей `rgba(accentRgb, 0.06)` вместо недоступного saturate(). `GlassSurface fallback` — плотная тонированная поверхность для карточек/слабых устройств.
- **ActionMenu**: позиция меню измеряется от триггера один раз при открытии (`measureInWindow`) и фиксируется — веб-баг «улетающего меню» (301573b/e59de9a) в RN исключён конструктивно.
- **Аура-фон**: один SVG-слой на корне приложения (`AuroraBackground`), радиальные градиенты с фейдом на 60% — 1:1 с веб `--aurora-image`.

## Фаза 3 (навигация и авторизация)

- **Хранение сессии**: MockApi-режим — сессия живёт в MMKV через StorageAdapter (как localStorage на вебе); RestApi-режим — токен в `expo-secure-store`, восстановление при старте через `initAuth()` + новый аддитивный метод `RestApi.restoreSession()` (поведение веба не меняется). `persistSession()` пишет/очищает SecureStore при входе/выходе.
- **Гейтинг маршрутов**: `app/index.tsx` — redirect-гейт (ждёт `ready`, затем `/(tabs)` или `/(auth)/login`); дополнительная защита от deep-link — guard в `(tabs)/_layout.tsx` и на `items/[id]`, `capture`.
- **Таб-бар**: 5 вкладок (Входящие, Поиск, Коллекции, Теги, Настройки), стеклянный фон (BlurView + тонировка surface), absolute-позиционирование; иконки lucide (Inbox/Search/Folder/Tags/Settings), активный — accent.
- **Stack-маршруты**: `items/[id]` (push), `collections/[id]` (внутри таба), `capture` — fullScreenModal со slide_from_bottom.
- **S12**: `+not-found` (404), глобальный `OfflineBanner` (NetInfo) в корне вместо отдельного offline-экрана, RN ErrorBoundary с теми же строками, что на вебе (хардкод English — как на вебе: i18n-стек сам может быть источником падения).
- **Клавиатура**: `KeyboardProvider` (react-native-keyboard-controller) в корне; auth-экраны в `KeyboardAvoidingView` (iOS padding).

## Фаза 4 (лента S4 + композер)

- **Инвертированная лента**: `Animated.FlatList inverted` (не FlashList — стабильнее для inverted): новые снизу (живой край = offset 0), `data[0]` рендерится внизу; строки собираются как на вебе (ascending + разделители дат впереди дня) и разворачиваются. `onEndReached` = скролл вверх по истории = подгрузка более старых (тот же курсор `capturedAt`, что на вебе). В инвертированном списке `contentOffset.y` — это расстояние от живого края, поэтому гистерезис компактного бара ложится напрямую: вход 80 / выход 24 (`condenseThresholds` из ui-core).
- **Компактный фильтр-бар**: веб-правило «один DOM-узел» в RN реализовано как кроссфейд двух экземпляров `SegmentedFilter` (full/compact) внутри полосы ПОСТОЯННОЙ высоты 52dp — layout shift невозможен конструктивно, состояние `filter` живёт в экране (ничего не теряется), анимация только opacity+scale, 220мс ease-out (`motion.morphMs`), `useReducedMotion` → duration 0. Триггер — `useAnimatedScrollHandler` (UI-поток), `runOnJS(setCondensed)` только в момент перехода порога.
- **expo-audio**: `isMeteringEnabled` — поле верхнего уровня `RecordingOptions` (не в android/ios-подопциях). **Отклонение от веба**: у `AudioRecorder` есть `pause()`, но нет `resume()` — из паузы доступны Stop (завершить) и Discard; запись не теряется. Level bar: `useAudioRecorderState(recorder, 100)`, metering в dB нормализуется `(dB+50)/50`.
- **Загрузка файлов (M1)**: `expo-document-picker` → `api.saveFile({ file: { uri, name, mimeType, size } })` — мобильный путь НЕ конвертирует файлы в base64/dataURL (в отличие от веба), MockApi хранит uri как есть. Без ограничения размера (решение от 14.11.2026).
- **Bulk-панель**: мультивыбор long-press; «В коллекцию» (M2-sheet), «Удалить» (1 → сразу + Undo-тост 8с с восстановлением через saveText как на вебе; >1 → M6-диалог). Кнопка bulk-экспорта появится в Фазе 6 вместе с M7 (expo-file-system + expo-sharing).
- **Таб-бар в нормальном потоке** (не absolute): композер гарантированно выше таб-бара без ручного расчёта высот; цена — лента не скроллится «под стеклом» таб-бара (осознанное упрощение).
- **Черновики**: `mmkv` (COMPOSER_DRAFT_KEY), переживают перезапуск; после M13 (Фаза 6) повторный вход их не теряет.

## Фаза 6 (настройки S10, захват S11, M7/M10/M12/M13)

- **Приём «Поделиться» — нативно через expo-sharing v58** (без社区 пакетов и самописных config plugins): `Sharing.getSharedPayloads()` / `clearSharedPayloads()` (experimental, Android+iOS); config-плагин expo-sharing зарегистрирован автоматически при `expo install` — он добавляет intent-фильтры ACTION_SEND/SEND_MULTIPLE. Чистая функция `parseSharePayloads()` (src/lib/share.ts) разбирает payload'ы на текст и файлы и покрыта юнит-тестами. Файлы копируются из кэша шаринга (`expo-file-system/legacy` copyAsync) ДО `clearSharedPayloads()` (иначе кэш очищается). Deep-link `stash://capture?text=&url=` работает параллельно через expo-router params.
- **Экспорт (M7)**: `exportData()` возвращает нейтральный `{data, mime, filename}`; запись через legacy `writeAsStringAsync` в cacheDirectory, выдача — `Sharing.shareAsync`. Бинарный ZIP с оригиналами не переносится (текстовый JSON/Markdown — как в MockApi; ограничение задокументировано в RestApi).
- **API-токены (M12)**: bottom sheet со списком, созданием (имя + срок в днях) и reveal-once диалогом секрета (копирование через expo-clipboard).
- **M13**: `sessionExpired` во AuthContext + глобальный SessionExpiredDialog (черновики в MMKV не теряются). Авто-триггер по 401 появится с реальным бэкендом (в MockApi сессия не истекает) — как и на вебе.
- **Настройки S10**: 6 разделов как на вебе; «Захват» вместо инструкции про расширение/PWA показывает подсказку про «Поделиться» (новый ключ локалей `settings.captureShareHint`, добавлен в общие packages/locales) + кнопку быстрого захвата + API-токены. Удаление аккаунта — M6 с вводом email. AI-ключ write-only, тест подключения, автообработка свитчем.
- **Запись аудио**: общая логика вынесена в `useRecorderFlow` + UI в `RecorderBar` (переиспользуются композером S4 и захватом S11 — без дублирования).
- **Тесты мобильного workspace** (vitest, node-окружение, алиасы на workspace-пакеты): парсинг share-payload'ов; MockApi с инжектируемым StorageAdapter (персистентность сессии и элементов, RN-файлы как uri без base64); typeFromMime на RN-кейсах (content://, file://, пустой mime).

## Открытые вопросы / на проверку в следующих фазах

- Hermes `Intl.PluralRules`/`RelativeTimeFormat`: проверить на первом прогоне в эмуляторе; при отсутствии — `@formatjs` polyfill до `initI18n()` (Фаза 4).
- `expo-file-system` в SDK 58: новый File/Directory API (старый — в `/legacy`); использовать новый в Phase 6 (экспорт M7 → `expo-sharing`).
- Share intent (ACTION_SEND/SEND_MULTIPLE): config plugin в Phase 6; cold/warm start — оба пути.
- Сплит «лента + детали» для планшетов ≥840dp — Фаза 5.
