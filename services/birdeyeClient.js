const { client: WebSocketClient } = require("websocket");
const util = require("util");
const EventEmitter = require('events');

class BirdeyeEmitter extends EventEmitter {}
const birdeyeEmitter = new BirdeyeEmitter();

let isConnected = false;
let lastMarketcap = null;
let lastPrice = null;
let reconnectTimeout = null;
let clientContractAddress = null;
let clientApiKey = null;

async function fetchInitialMarketCap(apiKey, tokenAddress) {
  if (!apiKey || !tokenAddress) {
    console.error('[Birdeye] API key and token address are required for initial fetch.');
    return null;
  }
  try {
    const options = {
      method: 'GET',
      headers: {
        'x-chain': 'solana',
        'X-API-KEY': apiKey
      }
    };
    const response = await fetch(`https://public-api.birdeye.so/defi/price?address=${tokenAddress}`, options);
    const data = await response.json();
    
    if (data.success && data.data && data.data.value) {
      const price = data.data.value;
      const marketCap = Math.floor(price * 1000000000);
      console.log(`[Birdeye] Fetched initial market cap: $${marketCap.toLocaleString()}`);
      return marketCap;
    } else {
      console.error('[Birdeye] Failed to fetch initial price from API.', data);
      return null;
    }
  } catch (error) {
    console.error('[Birdeye] Error fetching initial market cap:', error);
    return null;
  }
}

function connectToBirdeye(apiKey, tokenAddress) {
  console.log('[Birdeye] Starting connection...');
  console.log(`[Birdeye] API Key: ${apiKey ? 'Present' : 'Missing'}`);
  console.log(`[Birdeye] Token Address: ${tokenAddress}`);

  if (tokenAddress) clientContractAddress = tokenAddress;
  if (apiKey) clientApiKey = apiKey;

  if (!clientContractAddress || !clientApiKey) {
    console.error('[Birdeye] Cannot connect without contract address and API key.');
    return;
  }
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  const client = new WebSocketClient();
  
  client.on("connectFailed", (error) => {
    console.error("[Birdeye] Connect error:", error);
    handleDisconnect();
  });
  
  client.on("connect", (connection) => {
    console.log("[Birdeye] ✅ WebSocket connected for token:", clientContractAddress);
    isConnected = true;
    birdeyeEmitter.emit('status', 'connected');
    
    connection.on("error", (error) => {
      console.error("[Birdeye] Connection error:", error);
      handleDisconnect();
    });
    
    connection.on("close", () => {
      console.log("[Birdeye] Connection closed. Reconnecting...");
      handleDisconnect();
    });
    
    connection.on("message", (message) => {
      if (message.type === "utf8") {
        try {
          const data = JSON.parse(message.utf8Data);
          
          if (data.type === "PRICE_DATA") {
            const price = parseFloat(data.data.c) || 0;
            const marketcapValue = isNaN(price) ? 0 : Math.floor(price * 1000000000);

            if (!isNaN(marketcapValue) && marketcapValue > 0) {
              lastPrice = price;
              lastMarketcap = marketcapValue;
              
              birdeyeEmitter.emit("priceUpdate", {
                marketCap: marketcapValue,
                price: price,
                timestamp: Date.now(),
                contractAddress: clientContractAddress
              });
            }
          }
        } catch (err) {
          console.error("[Birdeye] JSON parse error:", err);
        }
      }
    });
    
    const msg = {
      type: "SUBSCRIBE_PRICE",
      data: {
        chartType: "1m",
        currency: "usd",
        address: clientContractAddress
      }
    };
    
    console.log('[Birdeye] Sending subscription message:', JSON.stringify(msg));
    connection.sendUTF(JSON.stringify(msg));
    console.log(`[Birdeye] Price subscription sent for token: ${clientContractAddress}`);
  });
  
  const chain = "solana";
  const wsUrl = util.format(
    "wss://public-api.birdeye.so/socket/%s?x-api-key=%s",
    chain,
    clientApiKey
  );
  
  console.log(`[Birdeye] Connecting to: ${wsUrl}`);
  client.connect(wsUrl, "echo-protocol", "https://birdeye.so");
}

function handleDisconnect() {
  isConnected = false;
  birdeyeEmitter.emit('status', 'disconnected');
  if (!reconnectTimeout) {
    console.log('[Birdeye] Scheduling reconnect in 5 seconds...');
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      console.log('[Birdeye] Attempting to reconnect...');
      connectToBirdeye(clientApiKey, clientContractAddress);
    }, 5000);
  }
}

async function fetchInitialTokenData(apiKey, tokenAddress) {
    console.log('[Birdeye] 🔍 Fetching initial token data...');
    
    if (!apiKey || !tokenAddress) {
        console.log('[Birdeye] ❌ Missing API key or token address for initial fetch');
        return null;
    }
    
    try {
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'x-chain': 'solana',
                'X-API-KEY': apiKey
            }
        };

        const url = `https://public-api.birdeye.so/defi/token_overview?address=${tokenAddress}&ui_amount_mode=scaled`;
        console.log(`[Birdeye] 📡 Making API request to: ${url}`);
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (data.success && data.data) {
            const price = data.data.price || 0;
            const marketCap = data.data.fdv || data.data.marketCap || (price * 1000000000);
            
            console.log(`[Birdeye] ✅ Initial data - Price: ${price}, Market Cap: ${marketCap}`);
            lastPrice = price;
            return { price, marketCap };
        } else {
            console.log('[Birdeye] ❌ API response indicates failure or missing data');
            return null;
        }
    } catch (error) {
        console.error('[Birdeye] ❌ Error fetching initial token data:', error.message);
        return null;
    }
}

function disconnectBirdeye() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  isConnected = false;
  console.log('[Birdeye] 🔌 Disconnecting...');
}

module.exports = {
  connectToBirdeye,
  fetchInitialTokenData,
  fetchInitialMarketCap,
  disconnectBirdeye,
  birdeyeEmitter,
  getLastPrice: () => lastPrice
};
