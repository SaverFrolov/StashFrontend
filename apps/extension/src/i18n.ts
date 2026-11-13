export type ExtLang = "ru" | "en";

const strings = {
  ru: {
    signIn: "Войти",
    signedOutHint: "Укажите адрес сервера и войдите в настройках расширения.",
    openOptions: "Открыть настройки",
    save: "Сохранить",
    saving: "Сохранение…",
    saveSelection: "Сохранить выделенный текст",
    commentPlaceholder: "Комментарий (необязательно)",
    collection: "Коллекция",
    noCollection: "Без коллекции",
    savedTitle: "Сохранено в Stash",
    openInApp: "Открыть в приложении",
    errorTitle: "Не удалось сохранить",
    serverUnreachable: "Сервер недоступен. Проверьте URL в настройках расширения.",
    retry: "Повторить",
    optionsTitle: "Настройки расширения Stash",
    serverUrl: "URL сервера",
    apiToken: "API-токен",
    apiTokenHint: "Создайте токен в приложении: Настройки → Захват → API-токены.",
    defaultCollection: "Коллекция по умолчанию",
    language: "Язык",
    testConnection: "Проверить подключение",
    testing: "Проверка…",
    testOk: "Подключение успешно",
    testFail: "Сервер недоступен",
    saved: "Сохранено",
    saveOptions: "Сохранить настройки",
  },
  en: {
    signIn: "Sign in",
    signedOutHint: "Set the server URL and sign in via the extension options.",
    openOptions: "Open options",
    save: "Save",
    saving: "Saving…",
    saveSelection: "Save selected text",
    commentPlaceholder: "Comment (optional)",
    collection: "Collection",
    noCollection: "No collection",
    savedTitle: "Saved to Stash",
    openInApp: "Open in app",
    errorTitle: "Could not save",
    serverUnreachable: "Server unreachable. Check the URL in extension options.",
    retry: "Retry",
    optionsTitle: "Stash extension options",
    serverUrl: "Server URL",
    apiToken: "API token",
    apiTokenHint: "Create a token in the app: Settings → Capture → API tokens.",
    defaultCollection: "Default collection",
    language: "Language",
    testConnection: "Test connection",
    testing: "Testing…",
    testOk: "Connection successful",
    testFail: "Server unreachable",
    saved: "Saved",
    saveOptions: "Save options",
  },
};

export type ExtStrings = (typeof strings)["ru"];

export async function getLang(): Promise<ExtLang> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["language"], (res) => {
      resolve(res.language === "en" ? "en" : "ru");
    });
  });
}

export async function getStrings(): Promise<ExtStrings> {
  const lang = await getLang();
  return strings[lang];
}
