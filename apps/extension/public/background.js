// MV3 service worker: context menus "Save page" / "Save selection".
// Plain JS by design — loaded directly as the service worker from dist/.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "save-page",
      title: "Save page to Stash",
      contexts: ["page", "link"],
    });
    chrome.contextMenus.create({
      id: "save-selection",
      title: "Save selection to Stash",
      contexts: ["selection"],
    });
  });
});

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["serverUrl", "apiToken"], (res) => resolve(res));
  });
}

async function savePayload(payload) {
  const { serverUrl, apiToken } = await getSettings();
  if (!serverUrl) throw new Error("not-configured");
  const res = await fetch(`${serverUrl.replace(/\/$/, "")}/items/${payload.url ? "link" : "text"}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`http-${res.status}`);
  return res.json();
}

function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  if (text) setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === "save-page") {
      await savePayload({ url: info.linkUrl || tab?.url || "", comment: undefined });
    } else if (info.menuItemId === "save-selection") {
      await savePayload({ text: info.selectionText || "", comment: tab?.url });
    }
    setBadge("✓", "#0E7C66");
  } catch (err) {
    setBadge("!", "#B42318");
    console.error("Inbox save failed", err);
  }
});
