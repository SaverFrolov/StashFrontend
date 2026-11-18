# Stash → Android (React Native / Expo): план миграции

**Фаза 0 — аудит. Дата: 18.11.2026.** Источник истины — код монорепозитория (значения токенов прочитаны из `packages/ui/src/tokens.css` и `tailwind-preset.ts`, состав модулей — фактический `ls`), а также спецификация `frontend_v2.docx` (вне репозитория) и `PROJECT_SUMMARY.txt`.

Цель: перенести дизайн и UX веб-фронтенда Stash в нативное Android-приложение (новый workspace `apps/mobile`, Expo, TypeScript strict). Визуальная идентичность — Liquid Glass с зелёным акцентом — сохраняется везде, где технически возможна.

---

## 1. Инвентарь экранов (S1–S12)

| # | Веб-маршрут | Файл | Перенос в RN |
|---|---|---|---|
| S1 | `/login` | `screens/LoginScreen.tsx` | stack-экран `auth/login` |
| S2 | `/signup` | `screens/SignupScreen.tsx` | stack-экран `auth/signup` |
| S3 | `/reset-password` | `screens/ResetPasswordScreen.tsx` | stack-экран `auth/reset-password` (2 состояния: форма / «проверьте почту») |
| S4 | `/inbox` | `screens/InboxScreen.tsx` | таб `(tabs)/inbox`: лента FlashList, фильтры, компактный бар (Reanimated), мультивыбор + bulk-панель, date-чипы (sticky sections), drop-zone → document picker |
| S5 | `/items/:id` | `screens/ItemDetailScreen.tsx` | stack `items/[id]`: 4 слоя (Оригинал / Мой комментарий / Аннотация ИИ / Извлечённый текст), метка «ИИ», предупреждение «Создано ИИ…», восстановление ИИ-версии, теги (M4), коллекции, похожее (≤5), детали обработки; сплит «лента 480px + детали» при ≥1280px → **только планшеты ≥840dp**, на телефоне обычный push |
| S6 | `/search` | `screens/SearchScreen.tsx` | таб `(tabs)/search`: режимы smart/keywords/meaning (сегмент), фильтры (тип/коллекция/тег/даты/статус), `<mark>` → вложенный `<Text>` с accent-фоном, бейджи «Ключевые слова/Смысл», недавние запросы |
| S7 | `/collections` | `screens/CollectionsScreen.tsx` | таб `(tabs)/collections`: список-строки (не грид), счётчики, «Обновлено» |
| S8 | `/collections/:id` | там же | stack `collections/[id]`: сортировки recent/title, удаление из коллекции (тост), edit/delete (M3/M6) |
| S9 | `/tags` | `screens/TagsScreen.tsx` | таб `(tabs)/tags`: таблица (тег/кол-во/происхождение), rename/merge/delete (M5, M6) |
| S10 | `/settings` | `screens/SettingsScreen.tsx` | таб `(tabs)/settings`: 6 разделов (Аккаунт, Внешний вид и язык, Обработка ИИ, Захват, Данные, О программе); подраздел «Захват»: вместо инструкции про расширение/PWA — подсказка про «Поделиться» на Android + API-токены (M12) |
| S11 | `/capture` | `screens/CaptureScreen.tsx` | fullscreen modal `(capture)`: текст/ссылка, комментарий, файл (document picker), запись аудио; **приём ACTION_SEND / ACTION_SEND_MULTIPLE** из других приложений с предзаполнением |
| S12 | `*`, `/offline`, ErrorBoundary | `NotFoundScreen.tsx`, `OfflineScreen.tsx`, `components/ErrorBoundary.tsx` | `+not-found`, offline-экран (NetInfo), RN Error Boundary |

## 2. Инвентарь модалок (M1–M14)

| # | Модалка | Веб-файл | Перенос |
|---|---|---|---|
| M1 | Загрузка файлов | `modals/UploadDialog.tsx` | bottom sheet + `expo-document-picker` (мультивыбор), валидация типа (`isAllowedUploadFile`), **без ограничения размера** |
| M2 | Добавить в коллекцию | `modals/AddToCollectionDialog.tsx` | bottom sheet: поиск, чекбоксы, «Создать коллекцию "…"» |
| M3 | Форма коллекции | `modals/CollectionFormDialog.tsx` | bottom sheet: имя (обяз.) + описание |
| M4 | Комбобокс тегов | `components/TagEditor.tsx` | inline-компонент в S5: автодополнение, Enter/click создаёт тег; пунктирные ИИ-чипы с accept/remove |
| M5 | Rename/Merge тегов | `screens/TagsScreen.tsx` | bottom sheet'ы |
| M6 | Подтверждение удаления | `modals/ConfirmDialog.tsx` | центральный glass-диалог; удаление аккаунта — с вводом email; единичное удаление элемента → тост с Undo 8с |
| M7 | Экспорт | `modals/ExportDialog.tsx` | bottom sheet: scope/format JSON|Markdown/4 чекбокса «включить»; выдача → `expo-file-system` + `expo-sharing` (вместо Blob+objectURL) |
| M8 | Детали обработки | `modals/ProcessingDrawer.tsx` | bottom sheet: шаги extract/annotate, timestamps, ошибки, Retry |
| M9 | Переработка | `modals/ReprocessDialog.tsx` | центральный glass-диалог: «что заменится / что не тронется» |
| M10 | Доступ к микрофону | `modals/MicPermissionDialog.tsx` | диалог denied/unsupported + `expo-av`/`expo-audio` permissions → системные настройки |
| M11 | Командная палитра ⌘K | `components/CommandPalette.tsx` | **НЕ переносится** (нет клавиатуры); поиск покрывает сценарий |
| M12 | API-токены | `screens/SettingsScreen.tsx` | bottom sheet + reveal-once диалог (`expo-clipboard`) |
| M13 | Сессия истекла | `modals/SessionExpiredDialog.tsx` | центральный glass-диалог со входом; черновики в MMKV не теряются |
| M14 | Горячие клавиши | `modals/ShortcutsDialog.tsx` | **НЕ переносится** |

## 3. Инвентарь `packages/ui` (что переиспользуем / чем заменяем)

Платформо-нейтральное → **новый пакет `packages/ui-core`** (веб получает ре-экспорты из `packages/ui`, чтобы ничего не сломать):
- `lib/plural.ts` — `pluralCategory/formatPlural/pluralKeySuffix` (Intl.PluralRules; на Hermes проверить, при отсутствии — polyfill `@formatjs/intl-pluralrules`); тесты «1 тег / 2 тега / 5 тегов» сохраняются
- `lib/status-meta.ts` — `STATUS_META/statusMeta/statusLabelKey/needsAttention` (7 статусов → labelKey+tone+icon)
- `lib/cn.ts` — склейка классов (NativeWind совместим)
- токены (см. §4) — канонический TS-источник

React/Radix-компоненты (веб) → RN-аналоги (новая реализация в `apps/mobile`, визуальный контракт тот же):
| Веб | RN |
|---|---|
| Button (primary gradient+glow, secondary glass, ghost, danger; h-9/h-11) | Pressable + `expo-linear-gradient` (primary), halo-фолбэк свечения, minHeight 48dp |
| Field/Input/Textarea | TextInput в glass-рамке `border-strong`, helper/error-тексты |
| Checkbox / Switch | Pressable+иконка / `Switch` (tint = accent) |
| Chip / TagChip (solid / dashed suggested, accept/remove) | Pressable-чипы, пунктир через borderStyle:"dashed" |
| StatusChip (иконка+текст, тон-рамки /40) | тот же контракт, `lucide-react-native` |
| Dialog / bottom sheet поведение (max-sm — bottom sheet) | `@gorhom/bottom-sheet` (M2,M4,M5,M7,M8,M9,M12) + центральные диалоги через RN Modal (M6,M13) |
| Menu/Popover (dropdown) | action sheet / якорный popover — **проверить, что меню не «улетает»** (веб-баг 301573b/e59de9a) |
| Toast (success/error/undo, desktop-bottom/mobile-top) | собственный Toast-provider на Reanimated (сверху на мобильном), Undo 8с |
| SegmentedControl (compact-вариант ≥32px) | Reanimated-сегменты, compact-состояние для фильтр-бара |
| Skeleton/ItemCardSkeleton | статичные плейсхолдеры (без shimmer — как на вебе) |
| Avatar (initials) | круглый initials-аватар |
| Tabs/Select | сегменты / кастомный picker (bottom sheet со списком) |

## 4. Токены дизайна (точные значения из `tokens.css`, 3 темы)

### Цвета
| Токен | Light | Dark (= system-dark) |
|---|---|---|
| `--bg` | `#EAF2EC` | `#0A120E` |
| `--surface` | `rgb(244 250 246 / 0.66)` | `rgb(22 34 28 / 0.55)` |
| `--surface-subtle` | `rgb(234 244 237 / 0.45)` | `rgb(30 44 37 / 0.45)` |
| `--border` | `rgb(14 124 102 / 0.14)` | `rgb(63 181 155 / 0.12)` |
| `--border-strong` | `rgb(14 124 102 / 0.28)` | `rgb(63 181 155 / 0.22)` |
| `--glass-border` | `rgb(14 124 102 / 0.18)` | `rgb(63 181 155 / 0.16)` |
| `--text` | `#12211B` | `#E9F0EA` |
| `--text-secondary` | `#46554E` | `#A5B4AA` |
| `--text-tertiary` | `#5F6F67` | `#85938A` |
| `--accent` | `#0E7C66` | `#3FB59B` |
| `--accent-hover` | `#0A6552` | `#5CC7AF` |
| `--accent-subtle` | `rgb(14 124 102 / 0.12)` | `rgb(63 181 155 / 0.16)` |
| `--success` | `#1A7F4B` | `#4CC38A` |
| `--warning` | `#9A6700` | `#E3B341` |
| `--danger` | `#B42318` | `#F97066` |
| RGB-каналы | accent `14 124 102`, success `26 127 75`, warning `154 103 0`, danger `180 35 24` | accent `63 181 155`, success `76 195 138`, warning `227 179 65`, danger `249 112 102` |

### Форма, глубина, типографика, движение
- Радиусы: контролы **10**, карточки материалов **14**, диалоги/панели **18**; полностью круглый — только аватар
- Тени: `--shadow-pop` light `0 8px 32px rgb(10 45 35 / 0.18)`, dark `0 8px 32px rgb(0 0 0 / 0.55)`; `--shadow-glow` light `0 4px 18px rgb(14 124 102 / 0.4)`, dark `0 4px 18px rgb(63 181 155 / 0.35)`
- Стекло: blur **20px** + saturate **160%** (на Android saturate нет → компенсируем насыщеннее зелёной тонировкой оверлея; blur только на крупных слоях: шапка, таб-бар, композер, bottom sheets, диалоги; ≤3–4 blur-слоя на экран; карточки ленты **без blur** — полупрозрачная зеленоватая заливка + зелёная hairline; prop-фолбэк плотной тонированной поверхности у GlassSurface)
- Аура-фон (один фиксированный слой на корень, не на экран): light — radial `rgb(16 185 129 / 0.28)` 8%/-8% 50×32rem, `rgb(5 150 105 / 0.2)` 92%/6% 46×30rem, `rgb(134 239 172 / 0.4)` 45%/112% 42×36rem; dark — `rgb(63 181 155 / 0.18)`, `rgb(16 185 129 / 0.12)`, `rgb(6 95 70 / 0.3)` тех же геометрий → RN: один `<Svg>` с RadialGradient на корне приложения
- Яркая зелёная обводка `border-accent/40`: чипы дат, строки поиска, «⋯»-меню карточек, выпадающие меню, палитра команд (на мобиле — её аналог не переносится, остальные — да)
- Типографика: Inter (веб: `@fontsource-variable/inter`; RN: `@expo-google-fonts/inter` — 400/500/600); шкала px/lh: xs 12/16, sm 13/18, base 14/20, md 16/24, lg 18/26, xl 22/28, 2xl 28/34, reading 16/26 (measure 65–75ch); tabular-nums → `fontVariant:["tabular-nums"]`; monospace — системный, только URL/токены/код; sentence case, без ALL-CAPS
- Отступы: база 4px (4,8,12,16,24,32,48,64); строки списков 12px vert. padding; контейнеры: лента/композер 720, детали 760 (в RN — max-width на планшете, full-bleed на телефоне)
- Анимации: переходы 150мс ease-out (цвета/трансформации), морф фильтр-бара **220мс ease-out**; только transform/opacity; `prefers-reduced-motion` → `AccessibilityInfo`/reanimated `useReducedMotion` (мгновенные переключения)
- Тач-цели ≥44dp (лучше 48); фокус-кольцо → состояния pressed/focused; статусы всегда «иконка + текст»

## 5. Замена веб-API и библиотек

| Веб | RN/Expo |
|---|---|
| react-router-dom v6 | expo-router (tabs + stack; `(tabs)`, `items/[id]`, `collections/[id]`, `capture` — fullscreen modal, auth-группа) |
| Vite 5 + Tailwind 3.4 | Metro (New Architecture, Hermes) + NativeWind v4; **`rgb(var(--x-rgb)/α)` в NativeWind не полагаемся — генерируем явные rgba в токенах**; неподдерживаемое — StyleSheet |
| Radix UI (dialog/menu/popover/toast/tabs/select/switch/checkbox/label) | @gorhom/bottom-sheet, RN Modal, кастомные action sheet/toast/segment/picker, RN Switch |
| lucide-react | lucide-react-native + react-native-svg |
| backdrop-filter blur/saturate | expo-blur BlurView (Android: tint + более насыщенная зелёная тонировка вместо saturate; только крупные слои) |
| aurora radial-gradient (CSS) | react-native-svg RadialGradient — один слой на корне |
| box-shadow glow | Android: цветные тени ограниченны → SVG-halo/градиентный ореол для главных кнопок (проверить на эмуляторе API 28+ и ниже) |
| localStorage | **StorageAdapter** (инжектируется в MockApi): веб — localStorage, мобильный — MMKV; токены — expo-secure-store |
| File/Blob/dataUrl (загрузки) | нейтральный `{uri, name, mimeType, size?}`; веб продолжает передавать dataURL как `uri` (поведение не меняется); мобильный — `content://`/`file://` URI (без base64 для больших файлов); `typeFromMime(mime,name)`/`isAllowedUploadFile({name,type})` уже принимают примитивы — проверяем на RN-кейсах тестами |
| `window.dispatchEvent(CustomEvent "inbox:mock-item-updated")` | нейтральный EventTarget-адаптер (инжектируется; веб — DOM-реализация по умолчанию) |
| `window.setTimeout` в MockApi | инжектируемый scheduler (дефолт — глобальный setTimeout; в RN доступен) |
| `Blob` в `exportData`, `new Blob().size` в `usage` | нейтральный результат `{ text, mime, filename }` (веб-обёртка сама делает Blob+objectURL) |
| MediaRecorder + AnalyserNode (уровень) | expo-audio recording с metering (`isMeteringEnabled` → уровень 0..1), Pause/Resume/Discard/Stop, встроенный плеер |
| `<audio>` / `<video>` | expo-audio (плеер аудио) / expo-video |
| `<input type="file" accept>` | expo-document-picker (pdf/docx/xlsx/аудио/видео, без ограничения размера) |
| Web Share Target (`share_target` в манифесте) | Android intent filters ACTION_SEND / ACTION_SEND_MULTIPLE (text/plain, application/pdf, docx, xlsx, audio/*, video/*) через config plugin; приём → открытие `capture` с предзаполнением |
| `navigator.clipboard` | expo-clipboard |
| objectURL + `<a download>` (экспорт) | expo-file-system (запись) + expo-sharing (отдать файл) |
| Intl.DateTimeFormat / RelativeTimeFormat / PluralRules | Hermes Intl — **проверить на целевом SDK**; при отсутствии — `@formatjs/intl-pluralrules`, `@formatjs/intl-relativetimeformat`, `@formatjs/intl-datetimeformat` (тесты «1 тег/2 тега/5 тегов» и relative-time сохраняем) |
| IntersectionObserver + View Transitions (фильтр-бар) | Reanimated: `useAnimatedScrollHandler`, shared values, UI-поток; пороги **80 вход / 24 выход**; 220мс ease-out; только transform/opacity; компактная sticky-строка как веб <1024px |
| `useMediaQuery("(min-width:1280px)")` | `useWindowDimensions()` — сплит при ≥840dp (планшеты) |
| `navigator.onLine` + events | @react-native-community/netinfo → onlineManager TanStack Query; offline-баннер |
| видимость вкладки (refetch) | AppState → focusManager TanStack Query |
| `data-theme` + prefers-color-scheme | ThemeProvider (light/dark/system) через `useColorScheme` + persisted-выбор (MMKV), `data-theme`-эквивалент — контекст |
| i18next-browser-languagedetector | expo-localization (getLocales) + persisted-выбор; `initImmediate:false`, `useSuspense:false` (урок веб-бага 0b36b62) |
| sticky date-чипы (CSS sticky) | FlashList `stickySectionHeadersEnabled` / SectionList-паттерн |
| `<mark>` подсветка | вложенный `<Text style={{backgroundColor: accentSubtle}}>` |
| safe-area insets (CSS env()) | react-native-safe-area-context + edge-to-edge |
| клавиатура (CSS sticky composer) | react-native-keyboard-controller (композер поднимается с клавиатурой), системный «назад» |
| CSS scrollbars / overscroll | нативные; iOS-rubber-band на Android не требуется |

## 6. Правки общих пакетов (без изменения поведения веба)

### `packages/api-client`
1. **StorageAdapter**: `interface StorageAdapter { getItem(key): string|null; setItem(key, value): void; removeItem(key): void }`; `MockApi` принимает адаптер (дефолт — localStorage-обёртка, чтобы веб не менялся); ключи те же (`inbox-mock-db-v1`, `inbox-mock-session-v1`)
2. **Нейтральные файлы**: `SaveFileInput.file: { uri: string; name: string; mimeType: string; size?: number }` (веб кладёт dataURL в `uri` — тип уже строковый, поведение то же); `SaveAudioInput.blob` — аналогично + `durationMs`
3. **Нейтральные события/таймеры/экспорт**: инжектируемые `emitItemUpdated` (дефолт — window CustomEvent), `setTimeout` (дефолт — глобальный), `exportData` возвращает `{ text, mime, filename }` (веб-слой делает Blob сам)
4. `typeFromMime`, `isAllowedUploadFile` — без изменений (примитивы), добавляем тесты с RN-кейсами (`content://` uri, mimeType из document picker)

### `packages/ui-core` (новый)
- канонические токены (TS-объекты: 3 темы, радиусы, тени, типографика, отступы, тайминги, аура-параметры, RGB-каналы)
- `plural.ts`, `status-meta.ts`, `cn.ts` (переезд из `packages/ui`)
- `packages/ui` ре-экспортирует из `ui-core` → веб-импорты не меняются; `tokens.css` остаётся, добавляем **тест сверки** значений CSS с TS-токенами (защита от дрейфа «одного источника»)

### Локали
- `apps/web/src/locales/{ru,en}.json` → **`packages/locales`** (377 ключей, 16 доменов); веб-`i18n.ts` меняет только путь импорта; мобильный импортирует тот же пакет. Ключи не копируются и не дублируются.

## 7. Веб-специфика, которая НЕ переносится

- Командная палитра ⌘K (M11) и шпаргалка горячих клавиш (M14), kbd-подсказки
- PWA: манифест, service worker, баннер установки, `beforeinstallprompt`
- Браузерное расширение и раздел настроек про него (заменяется подсказкой «Поделиться» на Android)
- Sidebar/drawer-навигация → нижний таб-бар (Входящие, Поиск, Коллекции, Теги, Настройки)
- Drag&drop файлов → document picker; hover-состояния → pressed
- Сплит «лента+детали» ≥1280px → только планшеты ≥840dp
- `window.open` оригиналов → `Linking.openURL` / системный просмотр файлов

## 8. Стек `apps/mobile` (фиксируется на фазе 2 по факту документации)

Expo SDK (актуальный стабильный — определяется через `create-expo-app@latest` на момент scaffold; New Architecture, Hermes, dev build/prebuild), expo-router, NativeWind v4 (Tailwind 3.4-совместим), react-native-reanimated, react-native-gesture-handler, @gorhom/bottom-sheet, react-native-svg, expo-linear-gradient, expo-blur, expo-audio, expo-video, expo-document-picker, expo-file-system, expo-sharing, expo-clipboard, expo-secure-store, expo-localization, react-native-mmkv, @shopify/flash-list, react-native-safe-area-context, react-native-keyboard-controller, @react-native-community/netinfo, @tanstack/react-query v5, react-i18next + i18next, lucide-react-native, zod (через api-client).

**Metro + pnpm**: `metro.config.js` — `watchFolders: [monorepoRoot]`, `resolver.nodeModulesPaths: [apps/mobile/node_modules, <root>/node_modules]`; при проблемах симлинков — `node-linker=hoisted` в `.npmrc` мобильного workspace (решение фиксируем в migration-notes по факту).

**Конфигурация API**: `EXPO_PUBLIC_API_BASE_URL` — аналог `VITE_API_BASE_URL`; не задан → MockApi (демо-вход: любая почта/пароль), задан → RestApi (Bearer; токен в expo-secure-store).

## 9. Риски и меры

1. **NativeWind v4 и `rgb(var(--x-rgb)/α)`** — CSS-переменные с alpha-подстановкой могут не поддержаться → токены сразу отдаём явными rgba-значениями (по темам), NativeWind используем для layout/spacing, цвета — из TS-токенов. Проверка — на фазе 2.
2. **Blur на Android** — дорогой; лимит 3–4 слоя (шапка, таб-бар, композер, активный sheet/диалог); карточки без blur; у `GlassSurface` prop `fallback` — плотная тонированная поверхность для слабых устройств и `renderToHardwareTextureAndroid`-сценариев.
3. **Цветная тень (glow) на Android** — поддерживается не везде/не всеми цветами → SVG-ореол для primary-кнопок; проверка на эмуляторах API 28+ и более старом.
4. **Hermes Intl** — проверить `Intl.PluralRules/RelativeTimeFormat/DateTimeFormat` на целевом SDK; при пробелах — formatjs-polyfill до инициализации i18n. Тесты форматтеров — обязательны (критерий приёмки).
5. **Большие файлы (видео)** — никаких dataURL/base64 в мобильном пути: храним `uri` (cache/documents), в MMKV — только метаданные; лимит размера отсутствует (решение пользователя от 14.11.2026).
6. **MockApi-таймеры и события** — после инъекции адаптеров поведение веба не должно измениться: 20 существующих тестов + smoke остаются зелёными после каждой фазы (жёсткое правило).
7. **Меню «⋯» не должно «улетать»** — на вебе был баг (301573b/e59de9a): в RN используем якорный popover/action sheet с фиксацией к триггеру и тестом на сценарий.
8. **Мигание темы при старте** — тема читается из MMKV синхронно до первого рендера (MMKV sync API), системная — через `useColorScheme` без асинхронщины.
9. **Java 25 vs Gradle** — для локальной сборки APK использовать JBR из Android Studio (`/Applications/Android Studio.app/Contents/jbr/Contents/Home`); `ANDROID_HOME=~/Library/Android/sdk` (в окружении не задан).
10. **Приём share-intent** — cold start и warm start разные пути (getInitialURL vs подписка); обрабатываем оба, тест парсинга входящего share — в критериях приёмки.
11. **Версии Expo/API** — перед каждой фазой сверяться с актуальной документацией (expo-audio vs expo-av, expo-video, bottom-sheet v4/v5, NativeWind v4) — фиксировать выбранные версии в migration-notes.

## 10. Допущения (зафиксированы для чекпоинта Фазы 1)

1. «Создать проект в Android Studio» трактуем как: scaffold Expo-workspace `apps/mobile` в существующем монорепозитории (по ТЗ), `npx expo prebuild --platform android` даёт нативный `android/`-проект, который открывается в Android Studio; финальный APK — через EAS preview или локальный gradle (команды дадим, если окружение не позволит собрать здесь).
2. Порядок табов: Входящие, Поиск, Коллекции, Теги, Настройки (по ТЗ).
3. Имя приложения/пакета: `Stash` / `com.saverfrolov.stash` (уточнить на чекпоинте, если нужно иное).
4. Целевой Android: minSdk по умолчанию Expo (24), проверка — API 28+ и один старый эмулятор (по критериям приёмки).
5. Языки: RU (по умолчанию) + EN, те же JSON-локали; системный язык через expo-localization.
6. Демо-данные и симуляция конвейера (включая сбои extraction/AI) — 1:1 с вебом (MockApi переиспользуется).
7. Визуальная сверка (скриншоты веб ~390×844 vs эмулятор, обе темы, каждый экран) — в `docs/mobile-parity/` на фазе 7; если эмулятор в этом окружении не запустится — предоставим точные команды и чек-лист сверки.
8. Коммиты — малыми порциями по фазам; после каждой фазы `pnpm -r build` + `pnpm -r test` зелёные.

## 11. Порядок фаз (напоминание)

- **Фаза 0** — этот документ (готово)
- **Фаза 1** — чекпоинт: ждём «ок» пользователя (допущения зафиксированы выше)
- **Фаза 2** — фундамент: `packages/ui-core` (+тест сверки токенов), `packages/locales`, StorageAdapter/нейтрализация api-client (+тесты), scaffold `apps/mobile` (Expo, TS strict, NativeWind, Metro+pnpm), ThemeProvider, GlassSurface, аура-фон, примитивы (Button, Field, Chip, StatusChip, TagChip, SegmentedFilter, Toast, Dialog, BottomSheet, ActionMenu), i18n + шрифты Inter
- **Фаза 3** — навигация/авторизация S1–S3, secure-store токен, EXPO_PUBLIC_API_BASE_URL, S12
- **Фаза 4** — S4 лента + композер + запись аудио + M1 + компактный фильтр-бар (Reanimated, 80/24, 220мс)
- **Фаза 5** — S5, S6, S7–S8, S9 + M2–M5, M8, M9
- **Фаза 6** — S10 (+M6, M7, M12), S11 + приём «Поделиться» (intent filters), M10, M13
- **Фаза 7** — a11y, производительность, визуальная сверка (docs/mobile-parity/), тесты (токены, StorageAdapter, plural/dates на Hermes, share-парсинг, typeFromMime для RN), сборка APK
