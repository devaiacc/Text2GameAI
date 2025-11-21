const { io } = require('socket.io-client');
const EventEmitter = require('events');

class PumpFunChatEmitter extends EventEmitter {}
const pumpFunChatEmitter = new PumpFunChatEmitter();

let pumpChatSocket = null;
let isConnected = false;
let messageStats = {
  totalMessages: 0,
  userLeft: 0,
  otherEvents: 0
};

function connectToPumpFunChat(tokenAddress) {
  console.log('[Pump.fun Chat] Starting connection...');
  console.log(`[Pump.fun Chat] Token Address: ${tokenAddress}`);

  if (!tokenAddress) {
    console.log('[Pump.fun Chat] Token address not provided. Skipping connection.');
    return;
  }

  if (pumpChatSocket && pumpChatSocket.connected) {
    console.log('[Pump.fun Chat] Already connected');
    return;
  }

  console.log('[Pump.fun Chat] Connecting to livechat...');
  
  pumpChatSocket = io("https://livechat.pump.fun", {
    path: "/socket.io",
    transports: ["websocket"],
    auth: {},
    reconnection: true,
    autoConnect: true,
    forceNew: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
  });

  setupChatEventListeners(tokenAddress);
}

function setupChatEventListeners(tokenAddress) {
  pumpChatSocket.on("connect", () => {
    console.log("[Pump.fun Chat] ✅ Connected! Socket ID:", pumpChatSocket.id);
    isConnected = true;
    pumpFunChatEmitter.emit('status', 'connected');
    
    setTimeout(() => {
      joinChatRoom(tokenAddress);
    }, 1000);
  });

  pumpChatSocket.on("disconnect", (reason) => {
    console.log("[Pump.fun Chat] ❌ Disconnected:", reason);
    isConnected = false;
    pumpFunChatEmitter.emit('status', 'disconnected');
  });

  pumpChatSocket.on("connect_error", (error) => {
    console.log("[Pump.fun Chat] 🔴 Connection error:", error.message);
  });

  const chatEvents = [
    "message", "chat", "newMessage", "messageReceived",
    "roomMessage", "chatMessage", "participants", "userMessage",
    "coinChat", "tradeChat", "globalMessage", "broadcast"
  ];

  chatEvents.forEach(event => {
    pumpChatSocket.on(event, (data) => {
      if (event === 'newMessage') {
        messageStats.totalMessages++;
      }

      if (data && (data.text || data.message)) {
        const chatMessage = {
          username: data.username || data.user || 'Anonymous',
          text: data.text || data.message,
          timestamp: new Date().toISOString(),
          event: event
        };
        
        pumpFunChatEmitter.emit('chatMessage', chatMessage);
      }
    });
  });

  pumpChatSocket.onAny((eventName, ...args) => {
    if (!chatEvents.includes(eventName) && !["connect", "disconnect", "connect_error", "userLeft"].includes(eventName)) {
      console.log(`[Pump.fun Chat] 🔍 [${eventName}]`, args);
      messageStats.otherEvents++;
    }
    
    if (eventName === 'userLeft') {
      messageStats.userLeft++;
    }
  });
}

function joinChatRoom(tokenAddress) {
  if (!pumpChatSocket || !pumpChatSocket.connected) return;
  
  console.log("[Pump.fun Chat] 🚪 Joining chat room...");
  
  pumpChatSocket.emit("join", tokenAddress);
  pumpChatSocket.emit("subscribe", { room: tokenAddress });
  pumpChatSocket.emit("joinRoom", { roomId: tokenAddress });
  pumpChatSocket.emit("join", {
    room: tokenAddress,
    type: "chat"
  });

  setTimeout(() => {
    console.log("[Pump.fun Chat] 📥 Requesting message history...");
    if (pumpChatSocket && pumpChatSocket.connected) {
      pumpChatSocket.emit("getMessages", tokenAddress);
      pumpChatSocket.emit("history", tokenAddress);
    }
  }, 2000);
}

function getChatStatus() {
  return {
    connected: isConnected,
    socketId: pumpChatSocket?.id || null,
    stats: messageStats
  };
}

function disconnectPumpFunChat() {
  if (pumpChatSocket && pumpChatSocket.connected) {
    console.log('[Pump.fun Chat] 🔌 Disconnecting...');
    pumpChatSocket.disconnect();
    pumpChatSocket = null;
    isConnected = false;
  }
}

module.exports = {
  connectToPumpFunChat,
  disconnectPumpFunChat,
  pumpFunChatEmitter,
  getChatStatus
};

