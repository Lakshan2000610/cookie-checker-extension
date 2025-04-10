importScripts("utils.js");

// ========== Cookie Analysis + Alert ==========

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.startsWith("http")) {
    chrome.storage.local.get("mode", (data) => {
      const mode = data.mode || "normal";
      const domain = new URL(tab.url).hostname;

      chrome.cookies.getAll({ url: tab.url }, (cookies) => {
        const analyzed = cookies.map(c => analyzeCookie(c, domain));

        chrome.storage.local.get(["cookieReports"], (store) => {
          const reports = store.cookieReports || {};
          reports[domain] = analyzed;
          chrome.storage.local.set({ cookieReports: reports });

          // Only alert in normal mode
          if (mode === "normal") {
            const insecure = analyzed.filter(c => c.issues.length > 0);
            if (insecure.length > 0) {
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => alert("⚠️ Insecure cookies detected. Click the extension icon for details.")
              });
            }
          }
        });
      });
    });
  }
});

// ========== Session Injection Usage Detector ==========

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const domain = new URL(details.url).hostname;
    const cookieHeader = details.requestHeaders.find(h => h.name.toLowerCase() === "cookie");
    if (!cookieHeader) return;

    chrome.storage.local.get("cookieTimeline", (data) => {
      const timeline = data.cookieTimeline || {};
      const domainLogs = timeline[domain] || [];

      let updated = false;

      domainLogs.forEach(log => {
        if (cookieHeader.value.includes(`${log.name}=${log.value}`)) {
          if (!log.usedInRequest) {
            log.usedInRequest = true;
            updated = true;
          }
        }
      });

      if (updated) {
        timeline[domain] = domainLogs;
        chrome.storage.local.set({ cookieTimeline: timeline });
      }
    });
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

// ========== Request Logger (Risky Behavior) ==========

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    chrome.storage.local.get(["requestLogs", "mode"], (data) => {
      if (data.mode !== "pentester") return;

      const url = new URL(details.url);
      const domain = url.hostname;
      const isHTTPS = url.protocol === "https:";
      const headers = details.requestHeaders || [];
      const cookieHeader = headers.find(h => h.name.toLowerCase() === "cookie");

      const requestEntry = {
        url: details.url,
        method: details.method,
        timestamp: Date.now(),
        isHTTPS,
        cookieHeader: cookieHeader?.value || "",
        flags: []
      };

      if (!isHTTPS && cookieHeader) {
        requestEntry.flags.push("⚠️ Cookie sent over HTTP (insecure)");
      }

      // Optional: log all cookies sent
      if (cookieHeader) {
        const cookieNames = (cookieHeader.value.match(/[^=;\s]+\s*=\s*[^;]+/g) || [])
          .map(c => c.split("=")[0].trim());
        requestEntry.flags.push(`📤 Cookies sent: ${cookieNames.join(", ")}`);
      }

      const logs = data.requestLogs || {};
      if (!logs[domain]) logs[domain] = [];
      logs[domain].push(requestEntry);

      chrome.storage.local.set({ requestLogs: logs });
    });
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

// ========== Cookie Blocking with Custom Rules ==========

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.startsWith("http")) {
    const domain = new URL(tab.url).hostname;

    chrome.cookies.getAll({ url: tab.url }, (cookies) => {
      chrome.storage.local.get(["cookieReports", "customRules"], (store) => {
        const reports = store.cookieReports || {};
        const rules = store.customRules || {};
        reports[domain] = [];

        cookies.forEach((cookie) => {
          const result = analyzeCookie(cookie, domain, rules);
          reports[domain].push(result);

          // Remove insecure cookies if blocking is enabled
          if (rules.enableBlocking && result.issues.length > 0) {
            chrome.cookies.remove({ url: tab.url, name: cookie.name });
            console.log(`🚫 Blocked insecure cookie: ${cookie.name}`);
          }
        });

        chrome.storage.local.set({ cookieReports: reports });
      });
    });
  }
});


chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "ws-send" || msg.type === "ws-recv") {
    const tabUrl = sender.tab?.url || "unknown";
    const domain = new URL(tabUrl).hostname;

    chrome.storage.local.get("websocketLogs", (data) => {
      const logs = data.websocketLogs || {};
      if (!logs[domain]) logs[domain] = [];
      logs[domain].push({ direction: msg.type, url: msg.url, message: msg.data, time: Date.now() });

      chrome.storage.local.set({ websocketLogs: logs });
    });
  }
});
