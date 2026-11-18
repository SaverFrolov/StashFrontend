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

## Открытые вопросы / на проверку в следующих фазах

- Hermes `Intl.PluralRules`/`RelativeTimeFormat`: проверить на первом прогоне в эмуляторе; при отсутствии — `@formatjs` polyfill до `initI18n()` (Фаза 4).
- `expo-file-system` в SDK 58: новый File/Directory API (старый — в `/legacy`); использовать новый в Phase 6 (экспорт M7 → `expo-sharing`).
- Share intent (ACTION_SEND/SEND_MULTIPLE): config plugin в Phase 6; cold/warm start — оба пути.
- Сплит «лента + детали» для планшетов ≥840dp — Фаза 5.
