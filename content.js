// content.js

(function() {
    const originalSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function(data) {
      chrome.runtime.sendMessage({ type: "ws-send", url: this.url, data });
      return originalSend.apply(this, arguments);
    };
  
    const originalWS = window.WebSocket;
    window.WebSocket = function(...args) {
      const socket = new originalWS(...args);
      socket.addEventListener('message', event => {
        chrome.runtime.sendMessage({ type: "ws-recv", url: args[0], data: event.data });
      });
      return socket;
    };
    window.WebSocket.prototype = originalWS.prototype;
  })();
  