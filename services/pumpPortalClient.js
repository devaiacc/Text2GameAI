const WebSocket = require('ws');
const EventEmitter = require('events');
const { getLastPrice } = require('./birdeyeClient');

class PumpPortalEmitter extends EventEmitter {}
const pumpPortalEmitter = new PumpPortalEmitter();

let currentWs = null;

function connectToPumpPortal(apiKey, tokenAddress) {
  if (currentWs && (currentWs.readyState === WebSocket.OPEN || currentWs.readyState === WebSocket.CONNECTING)) {
    console.log('[PumpPortal] Connection already active. Skipping new connection.');
    return;
  }

  console.log('[PumpPortal] Starting connection...');
  console.log(`[PumpPortal] API Key: ${apiKey ? 'Present' : 'Missing'}`);
  console.log(`[PumpPortal] Token Address: ${tokenAddress}`);

  if (!apiKey || !tokenAddress) {
    console.log('[PumpPortal] API key or token address not provided. Skipping connection.');
    return;
  }

  const url = `wss://pumpportal.fun/api/data?api-key=${apiKey}`;
  console.log(`[PumpPortal] Connecting to: ${url}`);

  const ws = new WebSocket(url);
  currentWs = ws;

  ws.on('open', () => {
    console.log('[PumpPortal] ✅ WebSocket connected successfully!');

    const payload = {
      method: "subscribeTokenTrade",
      keys: [tokenAddress]
    };

    console.log('[PumpPortal] Sending subscription:', JSON.stringify(payload));
    ws.send(JSON.stringify(payload));
    console.log(`[PumpPortal] 📡 Subscribed to trades for: ${tokenAddress}`);
  });

  ws.on('message', (data) => {
    try {
      const parsedData = JSON.parse(data);
      
      if (parsedData.txType === 'buy' || parsedData.txType === 'sell') {
        const isBuy = parsedData.txType === 'buy';
        
        let usdValue = parsedData.usdAmount || 0;
        
        if (usdValue === 0) {
            const currentPrice = getLastPrice();
            const tokenAmount = parsedData.tokenAmount || 0;
            if (currentPrice > 0 && tokenAmount > 0) {
                usdValue = tokenAmount * currentPrice;
            }
        }

        pumpPortalEmitter.emit('trade', {
          isBuy: isBuy,
          type: parsedData.txType,
          user: parsedData.traderPublicKey ? parsedData.traderPublicKey.substring(0, 8) + '...' : 'Unknown',
          solAmount: parsedData.solAmount || 0,
          tokenAmount: parsedData.tokenAmount || 0,
          usdValue: usdValue,
          txHash: parsedData.signature,
          timestamp: Date.now()
        });
      } else if (parsedData.signature) {
        console.log(`[PumpPortal] 📊 Trade detected: ${JSON.stringify(parsedData)}`);
      }
    } catch (error) {
      console.error('[PumpPortal] ❌ Error parsing message:', error);
      console.log('[PumpPortal] Raw message:', data.toString());
    }
  });

  ws.on('error', (error) => {
    console.error('[PumpPortal] ❌ WebSocket error:', error.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`[PumpPortal] 🔌 WebSocket disconnected. Code: ${code}, Reason: ${reason}`);
    console.log('[PumpPortal] 🔄 Reconnecting in 5 seconds...');
    setTimeout(() => connectToPumpPortal(apiKey, tokenAddress), 5000);
  });
}

function disconnectPumpPortal() {
  if (currentWs) {
    console.log('[PumpPortal] 🔌 Disconnecting...');
    currentWs.close();
    currentWs = null;
  }
}

module.exports = { connectToPumpPortal, disconnectPumpPortal, pumpPortalEmitter };

