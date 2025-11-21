# Text to GameAI (t2gai)

<div align="center">

**AI-Powered Game and Web Page Generator**

Transform your imagination into playable games and interactive web experiences instantly.

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-orange.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Command System](#command-system)
- [Security](#security)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**Text to GameAI** is a real-time, AI-powered platform that generates interactive games and web pages from natural language prompts. Built with cutting-edge AI models (Google Gemini 3 Pro Preview), it enables users to create fully functional, responsive games and web experiences through simple text commands.

### Key Capabilities

- **Instant Game Generation**: Create playable games from text prompts in ~60 seconds
- **Multiple Game Types**: Support for autoplay, PC (mouse/keyboard), and mobile (touch) games
- **Live Chat Integration**: Process prompts from Pump.fun live chat in real-time
- **Real-time Preview**: See generated content instantly in an embedded iframe
- **File Management**: Automatically save and manage generated HTML files
- **Request Queue System**: Handle multiple requests efficiently with queuing
- **Stream Processing**: Real-time streaming of AI responses for better UX

---

## ✨ Features

### Core Features

- 🤖 **AI-Powered Generation**: Uses Google Gemini 3 Pro Preview via OpenRouter
- 🎮 **Multiple Game Modes**: 
  - Autoplay games (no user interaction required)
  - PC games (mouse and keyboard controls)
  - Mobile games (touch-optimized)
- 💬 **Live Chat Integration**: Process commands from Pump.fun live chat
- 📱 **Responsive Design**: Fully responsive UI optimized for desktop and mobile
- 🔄 **Real-time Updates**: Socket.IO for instant updates and live preview
- 📁 **File Management**: Automatic HTML file generation and cleanup (max 20 files)
- 🎨 **Terminal-like UI**: MS-DOS inspired interface with green-on-black theme
- ⏱️ **Progress Tracking**: Visual countdown bars and status indicators
- 🔒 **Security**: Input sanitization and sensitive keyword filtering

### Advanced Features

- **Request Queue System**: Efficient handling of concurrent requests
- **Stream Processing**: Real-time streaming of AI model responses
- **Error Recovery**: Robust JSON parsing with recovery mechanisms
- **Market Data Integration**: Real-time crypto market cap and trade data
- **Game History**: Browse and access all previously generated games
- **Command Filtering**: Only process messages starting with valid commands

---

## 🛠 Technology Stack

### Backend

- **Node.js** (v22.x) - Runtime environment
- **Express.js** (v4.18.2) - Web framework
- **Socket.IO** (v4.7.5) - Real-time bidirectional communication
- **OpenAI SDK** (v4.52.7) - AI model integration via OpenRouter
- **dotenv** (v16.4.5) - Environment variable management
- **ws** (v8.18.0) - WebSocket client for external services
- **websocket** (v1.0.35) - WebSocket client library

### Frontend

- **Vanilla JavaScript** - No framework dependencies
- **Socket.IO Client** - Real-time communication
- **HTML5/CSS3** - Modern web standards
- **CSS Grid/Flexbox** - Responsive layouts

### External Services

- **OpenRouter** - AI model API gateway (Google Gemini 3 Pro Preview)
- **Birdeye API** - Crypto market data and price tracking
- **Pump.fun Chat** - Live chat integration via Socket.IO
- **PumpPortal** - Real-time trade data via WebSocket

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────┐
│   Client (Web)   │
│  (index.html)    │
└────────┬─────────┘
         │ Socket.IO
         │ HTTP/WS
         ▼
┌─────────────────────────────────┐
│      Express Server              │
│  ┌───────────────────────────┐  │
│  │  Socket.IO Server          │  │
│  │  - Real-time events        │  │
│  │  - Request queue           │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Request Processor         │  │
│  │  - Command parsing         │  │
│  │  - Prompt sanitization     │  │
│  │  - Queue management        │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  AI Model Handler          │  │
│  │  - Stream processing       │  │
│  │  - JSON parsing            │  │
│  │  - HTML generation         │  │
│  └───────────────────────────┘  │
└────────┬────────────────────────┘
         │
    ┌────┴────┬──────────┬─────────────┐
    │         │          │             │
    ▼         ▼          ▼             ▼
┌────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
│OpenRouter│ │Birdeye│ │Pump.fun │ │PumpPortal│
│  (AI)   │ │ (API) │ │  Chat   │ │  (WS)    │
└────────┘ └──────┘ └──────────┘ └──────────┘
```

### Request Flow

1. **User Input**: User sends prompt via input field or Pump.fun chat
2. **Command Parsing**: System extracts command (`!create`, `!pc`, `!mobile`) and prompt text
3. **Validation**: Input sanitization and sensitive keyword filtering
4. **Queue Management**: Request added to queue if system is busy
5. **AI Processing**: Stream request sent to OpenRouter API
6. **Response Parsing**: JSON extraction and validation
7. **HTML Generation**: Combine HTML, CSS, and JS into full HTML file
8. **File Storage**: Save to `public/generated/` directory
9. **Cleanup**: Remove oldest files if count exceeds 20
10. **Client Update**: Emit Socket.IO events to update UI

### Data Flow

```
User Prompt
    ↓
Command Parser (!create, !pc, !mobile)
    ↓
Input Sanitizer
    ↓
Request Queue (if busy)
    ↓
AI Model (Google Gemini 3 Pro Preview)
    ↓
Stream Response
    ↓
JSON Parser (with recovery)
    ↓
HTML Builder
    ↓
File System (public/generated/)
    ↓
Socket.IO Events
    ↓
Client UI Update
```

---

## 📦 Installation

### Prerequisites

- **Node.js** v22.x or higher
- **npm** v10.x or higher
- **Git** (for cloning)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/t2gai.git
cd t2gai
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# OpenRouter API Key (Required)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Birdeye API Key (Optional - for market data)
BIRDEYE_API_KEY=your_birdeye_api_key_here

# Contract/Token Address (Optional - for crypto features)
CONTRACT_ADDRESS=your_contract_address_here

# PumpPortal API Key (Optional - for trade data)
PUMPORTAL_API_KEY=your_pumpportal_api_key_here

# Test Input Mode (Optional - enables direct input field)
TEST_INPUT=true

# Server Port (Optional - defaults to 3000)
PORT=3000
```

### Step 4: Start the Server

```bash
npm start
```

Or for development:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENROUTER_API_KEY` | ✅ Yes | OpenRouter API key for AI model access | `sk-or-v1-...` |
| `BIRDEYE_API_KEY` | ❌ No | Birdeye API key for market data | `db072a314e...` |
| `CONTRACT_ADDRESS` | ❌ No | Solana token contract address | `FJW5rVSv9es...` |
| `PUMPORTAL_API_KEY` | ❌ No | PumpPortal API key for trade data | `6x658rjee1aq...` |
| `TEST_INPUT` | ❌ No | Enable direct input field (true/false) | `true` |
| `PORT` | ❌ No | Server port number | `3000` |

### Service Configuration

#### Birdeye Service

The Birdeye service provides real-time market cap and price updates. Configure it by setting:

```env
BIRDEYE_API_KEY=your_api_key
CONTRACT_ADDRESS=your_token_address
```

#### Pump.fun Chat Service

Connects to Pump.fun live chat for processing commands. Requires:

```env
CONTRACT_ADDRESS=your_token_address
```

#### PumpPortal Service

Provides real-time trade data. Configure with:

```env
PUMPORTAL_API_KEY=your_api_key
CONTRACT_ADDRESS=your_token_address
```

---

## 🚀 Usage

### Basic Usage

1. **Start the server**: `npm start`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Enter prompt**: Type your game idea in the input field or Pump.fun chat
4. **Watch generation**: See the AI generate your game in real-time
5. **Play**: Interact with the generated game in the preview iframe

### Command System

The platform supports three command types:

#### 1. Autoplay Games (`!create`)

Creates games that start automatically without user interaction.

```
!create snake game
!create space invaders
!create particle animation
```

**Features:**
- Auto-starting animations
- Self-playing demos
- Automatic game loops
- No user input required

#### 2. PC Games (`!pc`)

Creates games optimized for desktop with mouse and keyboard controls.

```
!pc first person shooter
!pc tower defense game
!pc puzzle platformer
```

**Features:**
- Mouse click interactions
- Keyboard controls (WASD, arrow keys)
- Desktop-optimized UI
- Precise mouse/keyboard control

#### 3. Mobile Games (`!mobile`)

Creates touch-optimized games for smartphones and tablets.

```
!mobile flappy bird
!mobile match 3 puzzle
!mobile endless runner
```

**Features:**
- Touch/tap events
- Swipe gestures
- Touch-friendly UI (44x44px minimum targets)
- Portrait and landscape support

### Input Methods

#### Method 1: Direct Input Field

If `TEST_INPUT=true` in `.env`, an input field appears at the bottom of the page. Enter commands directly:

```
!create pacman game
```

#### Method 2: Pump.fun Live Chat

Send messages in Pump.fun live chat starting with commands:

```
!create gta vice city
!pc call of duty
!mobile candy crush
```

**Note**: Messages not starting with `!create`, `!pc`, or `!mobile` are silently ignored.

### UI Features

#### AI Log Section

- **Location**: Top of the page (100px height, full width)
- **Style**: Terminal-like green-on-black display
- **Content**: Real-time AI processing messages
- **Countdown Bar**: Visual progress indicator (60-second countdown)

#### Preview Section

- **Live Preview**: Generated content displayed in iframe
- **Open in New Tab**: Link to view full-screen
- **Auto-refresh**: Updates automatically when new content is generated

#### Chat History

- **Location**: Right sidebar (320px width)
- **Features**:
  - Game type badges (Autoplay/Desktop/Mobile)
  - Prompt text
  - Status indicators (queued/processing/completed)
  - Links to generated HTML files
  - Relative timestamps

#### All Games Modal

- **Access**: Click "ALL GAMES" button in top bar
- **Features**:
  - List of all generated games
  - Game type labels
  - Original prompts
  - Direct links to games
  - Relative timestamps

---

## 📡 API Documentation

### REST Endpoints

#### GET `/`

Serves the main application page.

**Response**: HTML file (`public/index.html`)

#### GET `/api/games`

Returns a list of all generated games.

**Response**:
```json
{
  "games": [
    {
      "name": "generated-1234567890.html",
      "url": "/generated/generated-1234567890.html",
      "date": 1700000000000,
      "size": 15234,
      "requestId": "1234567890",
      "prompt": "create snake game",
      "commandType": "create"
    }
  ]
}
```

**Query Parameters**: None

**Status Codes**:
- `200`: Success
- `500`: Server error

### Socket.IO Events

#### Client → Server

##### `generate_code`

Sends a prompt for code generation.

```javascript
socket.emit('generate_code', {
  prompt: '!create snake game'
});
```

**Response Events**: `request_queued`, `request_started`, `model_response`, `request_completed`

#### Server → Client

##### `request_queued`

Emitted when a request is added to the queue.

```javascript
socket.on('request_queued', (data) => {
  console.log(data.requestId);      // Unique request ID
  console.log(data.prompt);         // User prompt
  console.log(data.queuePosition);  // Position in queue
  console.log(data.commandType);    // 'create', 'pc', or 'mobile'
});
```

##### `request_started`

Emitted when request processing begins.

```javascript
socket.on('request_started', (data) => {
  console.log(data.requestId);
  console.log(data.prompt);
  console.log(data.commandType);
});
```

##### `model_response`

Emitted during AI model streaming (multiple times).

```javascript
socket.on('model_response', (data) => {
  console.log(data.requestId);
  console.log(data.model);          // Model name
  console.log(data.content);        // Partial response
  console.log(data.isComplete);     // Boolean
});
```

##### `request_completed`

Emitted when request processing completes.

```javascript
socket.on('request_completed', (data) => {
  console.log(data.requestId);
  console.log(data.duration);       // Processing time in seconds
});
```

##### `generated_file_url`

Emitted when HTML file is saved.

```javascript
socket.on('generated_file_url', (data) => {
  console.log(data.requestId);
  console.log(data.url);            // Path to generated file
});
```

##### `ai_log_countdown_start`

Emitted when countdown bar starts.

```javascript
socket.on('ai_log_countdown_start', (data) => {
  console.log(data.requestId);
  console.log(data.prompt);
  console.log(data.totalSeconds);   // Usually 60
});
```

##### `ai_log_countdown_update`

Emitted during countdown (every second).

```javascript
socket.on('ai_log_countdown_update', (data) => {
  console.log(data.requestId);
  console.log(data.seconds);        // Remaining seconds
});
```

##### `marketCapUpdate`

Emitted when market cap data updates (Birdeye service).

```javascript
socket.on('marketCapUpdate', (data) => {
  console.log(data.marketCap);      // Market cap value
  console.log(data.price);          // Token price
});
```

##### `newTrade`

Emitted when a new trade is detected (PumpPortal service).

```javascript
socket.on('newTrade', (data) => {
  console.log(data.isBuy);          // Boolean
  console.log(data.usdValue);      // Trade value in USD
  console.log(data.user);          // Trader address (truncated)
});
```

---

## 🎮 Command System

### Command Syntax

All commands must start with a command prefix:

- `!create` - Autoplay games
- `!pc` - PC games (mouse/keyboard)
- `!mobile` - Mobile games (touch)

### Command Parsing

```
Input: "!create snake game"
↓
Command: "create"
Prompt: "snake game"
System Prompt: systemPromptAutoPlay
```

```
Input: "!pc first person shooter"
↓
Command: "pc"
Prompt: "first person shooter"
System Prompt: systemPromptPC
```

```
Input: "!mobile flappy bird"
↓
Command: "mobile"
Prompt: "flappy bird"
System Prompt: systemPromptMobile
```

### Invalid Commands

Messages not starting with valid commands are silently ignored:

- `create snake game` ❌ (missing `!`)
- `snake game` ❌ (no command)
- `!invalid command` ❌ (unknown command)

### Empty Prompts

Commands with empty prompts after the command are ignored:

- `!create` ❌ (no prompt)
- `!pc   ` ❌ (only whitespace)

---

## 🔒 Security

### Input Sanitization

All user inputs are sanitized to prevent XSS attacks:

- HTML entity encoding (`<`, `>`, `&`, `"`, `'`, `/`)
- Whitespace trimming
- Type validation

### Sensitive Keyword Filtering

The system blocks requests containing sensitive keywords:

- IP address requests
- Geolocation requests
- Browser fingerprinting
- User agent collection

**Blocked Keywords**:
```
ip address, ipaddress, location, geolocation,
fingerprint, browser fingerprint, navigator.geolocation,
ipify, ipapi, ip-api, ipinfo, ipgeolocation
```

### File System Security

- **Sandboxed iframes**: Generated HTML runs in sandboxed iframes
- **File limits**: Maximum 20 generated files (oldest deleted automatically)
- **Path validation**: All file paths are validated before access
- **No eval()**: Generated code does not use `eval()` or similar dangerous functions

### API Key Security

- **Environment variables**: All API keys stored in `.env` (not in code)
- **Git ignore**: `.env` file is excluded from version control
- **No hardcoding**: No API keys hardcoded in source code

### Best Practices

1. **Never commit `.env`**: Always keep `.env` in `.gitignore`
2. **Rotate keys**: Regularly rotate API keys
3. **Monitor usage**: Monitor API usage for anomalies
4. **Rate limiting**: Consider implementing rate limiting for production
5. **HTTPS**: Always use HTTPS in production

---

## 🚢 Deployment

### Heroku Deployment

#### Prerequisites

- Heroku account
- Heroku CLI installed
- Git repository

#### Steps

1. **Login to Heroku**:
```bash
heroku login
```

2. **Create Heroku App**:
```bash
heroku create your-app-name
```

3. **Set Environment Variables**:
```bash
heroku config:set OPENROUTER_API_KEY=your_key
heroku config:set BIRDEYE_API_KEY=your_key
heroku config:set CONTRACT_ADDRESS=your_address
heroku config:set PUMPORTAL_API_KEY=your_key
heroku config:set TEST_INPUT=true
```

4. **Deploy**:
```bash
git push heroku main
```

5. **Open App**:
```bash
heroku open
```

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t t2gai .
docker run -p 3000:3000 --env-file .env t2gai
```

### Environment-Specific Configuration

#### Development

```env
TEST_INPUT=true
PORT=3000
```

#### Production

```env
TEST_INPUT=false
PORT=80
NODE_ENV=production
```

---

## 📁 Project Structure

```
t2gai/
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
├── Procfile                  # Heroku process file
├── .env                      # Environment variables (gitignored)
├── .gitignore               # Git ignore rules
├── README.md                 # This file
│
├── public/                   # Static files
│   ├── index.html            # Main frontend file
│   └── generated/            # Generated HTML files (auto-created)
│       └── generated-*.html  # Generated game files
│
└── services/                 # External service clients
    ├── birdeyeClient.js      # Birdeye API client
    ├── pumpFunChatClient.js  # Pump.fun Chat client
    └── pumpPortalClient.js   # PumpPortal WebSocket client
```

### Key Files

- **`server.js`**: Express server, Socket.IO, AI model integration, request processing
- **`public/index.html`**: Frontend UI, Socket.IO client, real-time updates
- **`services/birdeyeClient.js`**: Birdeye API integration for market data
- **`services/pumpFunChatClient.js`**: Pump.fun chat integration
- **`services/pumpPortalClient.js`**: PumpPortal trade data integration

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Use ES6+ JavaScript features
- Follow existing code style
- Add comments for complex logic
- Keep functions focused and small
- Use meaningful variable names

### Testing

Before submitting:

- Test all command types (`!create`, `!pc`, `!mobile`)
- Test error handling
- Test mobile responsiveness
- Verify security measures

### Reporting Issues

Use GitHub Issues to report bugs or request features. Include:

- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (Node.js version, OS, etc.)

---

## 📄 License

This project is licensed under the **ISC License**.

```
ISC License

Copyright (c) 2024

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## 🙏 Acknowledgments

- **OpenRouter** - AI model API gateway
- **Google Gemini** - AI model provider
- **Birdeye** - Crypto market data API
- **Pump.fun** - Live chat platform
- **PumpPortal** - Trade data service
- **Socket.IO** - Real-time communication library
- **Express.js** - Web framework

---

## 📞 Support

For support, please open an issue on GitHub or contact the maintainers.

---

<div align="center">

**Made with ❤️ using AI**

[Report Bug](https://github.com/yourusername/t2gai/issues) · [Request Feature](https://github.com/yourusername/t2gai/issues) · [Documentation](https://github.com/yourusername/t2gai#readme)

</div>

