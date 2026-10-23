chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try { await chrome.tabs.sendMessage(tab.id, {type: 'ciltro:toggle'}); }
    catch { await chrome.action.setBadgeText({tabId: tab.id, text: '!'}); }
  }
});
