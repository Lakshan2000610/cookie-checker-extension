// ==========================
// Mode Switch Logic
// ==========================

const userUI = document.getElementById("userUI");
const pentesterUI = document.getElementById("pentesterUI");
const btnUser = document.getElementById("btnUser");
const btnPentester = document.getElementById("btnPentester");

function switchMode(mode) {
  if (mode === "pentester") {
    userUI.style.display = "none";
    pentesterUI.style.display = "block";
  } else {
    userUI.style.display = "block";
    pentesterUI.style.display = "none";
  }
  chrome.storage.local.set({ mode });
}

btnUser.addEventListener("click", () => switchMode("normal"));
btnPentester.addEventListener("click", () => switchMode("pentester"));

// ==========================
// Sidebar Tab Navigation (Pentester Only)
// ==========================

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ==========================
// Initial Load
// ==========================

chrome.storage.local.get("mode", (data) => {
  const mode = data.mode || "normal";
  switchMode(mode);
});

// ==========================
// Load Domains for Both Modes
// ==========================

function populateDomains(selectId, reportId, filtersId, jsonBtnId, csvBtnId, copyBtnId) {
  chrome.storage.local.get("cookieReports", (data) => {
    const reports = data.cookieReports || {};
    const domainSelect = document.getElementById(selectId);
    domainSelect.innerHTML = "";

    Object.keys(reports).forEach(domain => {
      const option = document.createElement("option");
      option.value = domain;
      option.textContent = domain;
      domainSelect.appendChild(option);
    });

    domainSelect.addEventListener("change", () => {
      const domain = domainSelect.value;
      const cookies = reports[domain] || [];
      const filters = Array.from(document.querySelectorAll(`#${filtersId} input:checked`)).map(cb => cb.value);
      const filtered = cookies.filter(cookie => filters.includes(cookie.risk));
      showReport(domain, filtered, reportId);

      document.getElementById(jsonBtnId).onclick = () => {
        const json = JSON.stringify(filtered, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url, filename: `${domain}-cookies.json`, saveAs: true }, () => {
          alert("✅ Exported. If issues, check extension error log manually.");
        });
      };

      document.getElementById(csvBtnId).onclick = () => {
        const csv = exportToCSV(filtered);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url, filename: `${domain}-cookies.csv`, saveAs: true }, () => {
          alert("✅ Exported. Check errors via chrome://extensions > Details > Errors");
        });
      };

      document.getElementById(copyBtnId).onclick = () => {
        const cookieHeader = filtered.map(c => `${c.name}=${c.value}`).join("; ");
        const fullHeader = `Cookie: ${cookieHeader}`;
        navigator.clipboard.writeText(fullHeader).then(() => {
          alert("✅ Cookie header copied to clipboard!");
        }).catch(err => {
          alert("❌ Failed to copy header. Check error log manually.");
        });
      };
    });

    domainSelect.dispatchEvent(new Event("change"));
  });
}

function showReport(domain, cookies, reportId) {
  const container = document.getElementById(reportId);
  container.innerHTML = "";
  if (!cookies.length) {
    container.innerHTML = `<p>No cookies found for ${domain}.</p>`;
    return;
  }
  cookies.forEach(cookie => {
    const li = document.createElement("div");
    li.innerHTML = `<b style="color:${cookie.risk === "High" ? "red" : cookie.risk === "Medium" ? "orange" : "green"}">${cookie.name}</b> – 
    <i>${cookie.risk} Risk</i><br/>
    <small>Issues: ${cookie.issues.join(", ")}</small><hr>`;
    container.appendChild(li);
  });
}

populateDomains("domainSelect", "report", "riskFilters", "exportJSON", "exportCSV", "copyHeader");
populateDomains("domainSelectUser", "reportUser", "riskFiltersUser", "exportUserJSON", "exportUserCSV", "copyHeaderUser");

// ==========================
// Data Clearing Options
// ==========================

// Manual clear button
const clearBtn = document.createElement("button");
clearBtn.textContent = "🧹 Clear All Logs";
clearBtn.className = "mode-btn";
clearBtn.style.margin = "15px";


document.body.appendChild(clearBtn);

clearBtn.addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    alert("✅ All stored data has been cleared.");
    location.reload();
  });
});



// ==========================
// Enhanced Timeline Viewer with Filter + Clear
// ==========================

const timelineHeader = document.createElement("div");
timelineHeader.innerHTML = `
  <div style="margin-bottom: 10px;">
    <label style="font-size:13px;">
      🗂️ Filter:
      <select id="timelineFilterSelect" style="width:60%;padding:4px;background:#1E1E2F;color:#F8F8F8;border:1px solid #2C2F48;border-radius:4px;">
        <option value="all">Show All</option>
        <option value="XSS-Test">XSS Tests Only</option>
        <option value="Session">Session Hijack Only</option>
      </select>
    </label>
    <button id="clearFilteredTimeline" style="float:right;background:transparent;color:#FF3B30;border:1px solid #FF3B30;border-radius:4px;padding:4px 8px;cursor:pointer;">🧹 Clear Filtered</button>
  </div>
`;
document.getElementById("timelineData").before(timelineHeader);

document.getElementById("timelineFilterSelect").addEventListener("change", loadTimeline);
document.getElementById("clearFilteredTimeline").addEventListener("click", () => {
  const selectedFilter = document.getElementById("timelineFilterSelect").value;
  chrome.storage.local.get("cookieTimeline", (data) => {
    const timeline = data.cookieTimeline || {};
    const updated = {};

    Object.entries(timeline).forEach(([domain, logs]) => {
      updated[domain] = logs.filter(entry => {
        if (selectedFilter === "XSS-Test") return entry.type !== "XSS-Test";
        if (selectedFilter === "Session") return entry.type === "XSS-Test";
        return false; // Clear all if "all"
      });
    });

    chrome.storage.local.set({ cookieTimeline: updated }, () => {
      alert("🧹 Filtered logs cleared!");
      loadTimeline();
    });
  });
});

function loadTimeline() {
  chrome.storage.local.get("cookieTimeline", (data) => {
    const timeline = data.cookieTimeline || {};
    const container = document.getElementById("timelineData");
    const selectedFilter = document.getElementById("timelineFilterSelect").value;
    container.innerHTML = "";

    const allDomains = Object.keys(timeline);
    if (allDomains.length === 0) {
      container.innerHTML = "<p>No session injections logged yet.</p>";
      return;
    }

    allDomains.forEach(domain => {
      const logs = timeline[domain];
      const filteredLogs = logs.filter(log => {
        if (selectedFilter === "XSS-Test") return log.type === "XSS-Test";
        if (selectedFilter === "Session") return log.type !== "XSS-Test";
        return true;
      });

      if (filteredLogs.length > 0) {
        container.innerHTML += `<h4 style="color:var(--color-primary);margin-top:10px;">🔗 ${domain}</h4>`;
        filteredLogs.forEach(entry => {
          const time = new Date(entry.timestamp).toLocaleTimeString();
          const status = entry.usedInRequest ? "✅ Used in request" : "❌ Not used";
          const icon = entry.type === "XSS-Test" ? "💥" : "🛡️";
          const typeLabel = entry.type ? ` <span style='color:var(--color-text-muted);font-size:12px;'>[${entry.type}]</span>` : "";
          container.innerHTML += `
            <div style="margin-bottom:10px;">
              ${icon} <b>${entry.name}</b>=<code>${entry.value}</code>${typeLabel}<br>
              <span>${time}</span> → <span>${status}</span>
            </div>
            <hr>
          `;
        });
      }
    });
  });
}



// ==========================
// Session Hijack Injection + Logging
// ==========================

document.getElementById("injectCookie").addEventListener("click", () => {
  const name = document.getElementById("cookieName").value.trim();
  const value = document.getElementById("cookieValue").value.trim();

  if (!name || !value) return alert("❌ Enter both cookie name and value!");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (name, value) => {
        document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
      },
      args: [name, value]
    });

    const domain = new URL(tabs[0].url).hostname;
    const timestamp = Date.now();

    chrome.storage.local.get("cookieTimeline", (data) => {
      const timeline = data.cookieTimeline || {};
      if (!timeline[domain]) timeline[domain] = [];

      timeline[domain].push({ name, value, timestamp, usedInRequest: false });

      chrome.storage.local.set({ cookieTimeline: timeline }, () => {
        alert(`🧪 Injected '${name}' and logged in timeline.`);
        loadTimeline();
      });
    });
  });
});
// ==========================
// XSS Simulation Logic
// ==========================

document.getElementById("injectXSS").addEventListener("click", () => {
  const name = document.getElementById("xssCookieName").value.trim();
  const payload = document.getElementById("xssPayload").value.trim();

  if (!name || !payload) {
    alert("❌ Please enter both name and payload.");
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const domain = new URL(tabs[0].url).hostname;
    const timestamp = Date.now();

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (name, value) => {
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
        setTimeout(() => {
          if (document.body.innerHTML.includes(value)) {
            alert("⚠️ XSS payload reflected in DOM!");
          } else {
            alert("✅ Cookie injected. No reflection detected.");
          }
        }, 500);
      },
      args: [name, payload]
    });

    // Log in timeline
    chrome.storage.local.get("cookieTimeline", (data) => {
      const timeline = data.cookieTimeline || {};
      if (!timeline[domain]) timeline[domain] = [];

      timeline[domain].push({
        name,
        value: payload,
        type: "XSS-Test",
        timestamp,
        usedInRequest: false
      });

      chrome.storage.local.set({ cookieTimeline: timeline });
    });
  });
});


// ==========================
// Request Logs Viewer (Enhanced)
// ==========================

function loadRequestLogs(domain) {
  chrome.storage.local.get("requestLogs", (data) => {
    const logs = data.requestLogs?.[domain] || [];
    const container = document.getElementById("requestLogs");
    const selected = Array.from(document.querySelectorAll("#logFilters input:checked")).map(cb => cb.value);

    const filtered = logs.filter(log => {
      if (selected.includes("http") && log.isHTTPS) return false;
      if (selected.includes("cookie") && !log.cookieHeader) return false;
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = "<p>No matching requests.</p>";
      return;
    }

    // Summary
    const total = filtered.length;
    const flagged = filtered.filter(r => r.flags && r.flags.length).length;
    const summary = `<div style='margin-bottom:10px;font-size:13px;'>🧾 Total: <b>${total}</b> | 🚨 Warnings: <b>${flagged}</b> <button id="clearRequestLogs" style="float:right;background:transparent;color:#FF3B30;border:1px solid #FF3B30;border-radius:4px;padding:4px 8px;cursor:pointer;">🧹 Clear Logs</button></div>`;

    container.innerHTML = summary + filtered.map(log => {
      const time = new Date(log.timestamp).toLocaleString();
      const color = log.isHTTPS ? "green" : "red";
      return `
        <div style="margin-bottom:10px;">
          <b>${log.method}</b> <span style="color:${color}">${log.url}</span><br>
          <small>${time}</small><br>
          ${log.cookieHeader ? `<code style='color:#00FF41'>${log.cookieHeader}</code><br>` : ""}
          <i>${(log.flags || []).join("<br>")}</i>
        </div>
        <hr>
      `;
    }).join("");

    document.getElementById("clearRequestLogs").addEventListener("click", () => {
      chrome.storage.local.get("requestLogs", (data) => {
        const logs = data.requestLogs || {};
        logs[domain] = [];
        chrome.storage.local.set({ requestLogs: logs }, () => {
          alert("🧹 Request logs cleared for this domain.");
          loadRequestLogs(domain);
        });
      });
    });

    // Export support
    document.getElementById("exportRequestsJSON").onclick = () => {
      const json = JSON.stringify(filtered, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename: `${domain}-requests.json`, saveAs: true });
    };

    document.getElementById("exportRequestsCSV").onclick = () => {
      const csv = exportToCSV(filtered);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename: `${domain}-requests.csv`, saveAs: true });
    };
  });
}


document.getElementById("triggerCSRF").addEventListener("click", () => {
  const url = document.getElementById("csrfUrl").value.trim();
  const body = document.getElementById("csrfPayload").value.trim();

  if (!url || !body) return alert("❌ Enter both URL and payload.");

  chrome.tabs.create({ url: "about:blank", active: false }, (tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url, body) => {
        fetch(url, {
          method: "POST",
          credentials: "include", // send cookies
          headers: { "Content-Type": "application/json" },
          body
        }).then(r => console.log("CSRF result:", r.status));
      },
      args: [url, body]
    });
  });

  alert("🚨 CSRF test sent! Check target behavior.");
});


// Switch attack panels based on dropdown selection
document.getElementById("attackSelect").addEventListener("change", (e) => {
  const value = e.target.value;
  document.querySelectorAll(".attack-panel").forEach(panel => panel.style.display = "none");
  document.getElementById(`attack-${value}`).style.display = "block";
});


// ==========================
// Rule Engine UI Initialization
// ==========================

function loadCustomRules() {
  chrome.storage.local.get("customRules", (data) => {
    const r = data.customRules || {};
    if (r.minLength !== undefined) document.getElementById("minLength").value = r.minLength;
    if (r.requireSecure !== undefined) document.getElementById("requireSecure").checked = r.requireSecure;
    if (r.requireHttpOnly !== undefined) document.getElementById("requireHttpOnly").checked = r.requireHttpOnly;
    if (r.requireSameSite !== undefined) document.getElementById("requireSameSite").checked = r.requireSameSite;
    if (r.enableBlocking !== undefined) document.getElementById("enableBlocking").checked = r.enableBlocking;
  });
}

loadCustomRules();

document.getElementById("saveRules").addEventListener("click", () => {
  const rules = {
    minLength: parseInt(document.getElementById("minLength").value),
    requireSecure: document.getElementById("requireSecure").checked,
    requireHttpOnly: document.getElementById("requireHttpOnly").checked,
    requireSameSite: document.getElementById("requireSameSite").checked,
    enableBlocking: document.getElementById("enableBlocking").checked
  };
  chrome.storage.local.set({ customRules: rules }, () => {
    alert("✅ Custom rules saved!");
    loadCustomRules();
  });
});

document.getElementById("resetRules")?.addEventListener("click", () => {
  const defaults = {
    minLength: 12,
    requireSecure: true,
    requireHttpOnly: true,
    requireSameSite: true,
    enableBlocking: false
  };
  chrome.storage.local.set({ customRules: defaults }, () => {
    alert("🔄 Rules reset to default.");
    loadCustomRules();
  });
});

// ==========================
// Enhance Cookie Report with Rule Violations
// ==========================

function showReport(domain, cookies, reportId) {
  const container = document.getElementById(reportId);
  container.innerHTML = "";
  if (!cookies.length) {
    container.innerHTML = `<p>No cookies found for ${domain}.</p>`;
    return;
  }

  chrome.storage.local.get("customRules", (data) => {
    const rules = data.customRules || {};

    cookies.forEach(cookie => {
      const li = document.createElement("div");
      const color = cookie.risk === "High" ? "red" : cookie.risk === "Medium" ? "orange" : "green";
      const badgeList = cookie.issues.map(issue => `<span style='background:#FF3B30;color:#fff;padding:2px 4px;border-radius:3px;margin-right:5px;font-size:11px;'>${issue}</span>`).join("");
      li.innerHTML = `<b style="color:${color}">${cookie.name}</b> – 
        <i>${cookie.risk} Risk</i><br/>
        ${badgeList}<br/>
        <small>Domain: ${cookie.domain}</small>
        <hr>`;
      container.appendChild(li);
    });
  });
}
