# 🧪 Cookie Inspector & Pentester Toolkit – Chrome Extension

This Chrome Extension is a dual-mode tool for cookie security auditing and penetration testing.

---

## 🧩 Manual Installation (for testers)

1. Clone or download this repo:
   [Download ZIP](https://github.com/Lakshan2000610/cookie-checker-extension.git)

2. Open `chrome://extensions/` in Chrome

3. Enable **Developer Mode** (top right)

4. Click **Load Unpacked** and select the extracted folder

✅ That’s it — the extension will now run locally!

---

## 🚀 Features

### 🧭 Dual Mode Support
- **Normal User Mode**
  - Alerts for insecure cookies
  - Simple cookie risk summaries

- **Pentester Mode**
  - Full toolkit for session hijacking, XSS, CSRF
  - Cookie Timeline Viewer
  - Request Analysis Dashboard
  - Custom Rules Engine

---

## 🔐 Cookie Auditing
- Detects missing `Secure`, `HttpOnly`, `SameSite` attributes
- Flags third-party cookies
- Detects short/weak cookie values
- Supports per-domain reports

---

## 🛠️ Penetration Toolkit
- **Session Hijack Simulator**
  - Injects a fake session cookie
  - Logs whether it is used in future requests

- **XSS Payload Tester**
  - Injects a cookie with XSS payload
  - Detects reflection in DOM

- **CSRF Simulator**
  - Sends forged POST request with custom payload

---

## 📡 Request Analysis
- Logs all outgoing HTTP(S) requests
- Flags cookies sent over HTTP
- Highlights cookie leaks
- Exports request logs (CSV / JSON)

---

## 📈 Cookie Timeline Viewer
- Logs session hijack and XSS tests
- Filter by attack type
- View per-domain logs

---

## ⚙️ Rules Engine
- Define custom cookie rules:
  - Min length
  - Require `Secure`, `HttpOnly`, `SameSite`
  - Enable auto-blocking
- Save & Reset rules

---

## 🎨 UI and Themes
- Futuristic dark theme
- Sidebar navigation (in Pentester Mode)
- Dropdown-based attack switcher

---

## 📦 Installation

### Development Mode:
1. Clone or download this repo.
2. Open `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load Unpacked**
5. Select the project folder

---

## 📁 File Structure
```
cookie-extension/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── background.js
├── content.js
├── utils.js
└── icons/
```

---

## 📜 License
This project is for educational and research purposes only. Use responsibly.

---

## 🙌 Contributions
Feel free to fork, enhance, and contribute. 
