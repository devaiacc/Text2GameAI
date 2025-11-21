const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const OpenAI = require('openai');
const { connectToBirdeye, fetchInitialTokenData, birdeyeEmitter } = require('./services/birdeyeClient');
const { connectToPumpFunChat, pumpFunChatEmitter } = require('./services/pumpFunChatClient');
const { connectToPumpPortal, pumpPortalEmitter } = require('./services/pumpPortalClient');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const openrouter = new OpenAI({ 
  baseURL: 'https://openrouter.ai/api/v1', 
  apiKey: OPENROUTER_API_KEY 
});

app.use(express.static(path.join(__dirname, 'public')));

// Ensure generated directory exists
const generatedDir = path.join(__dirname, 'public', 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/games', (req, res) => {
  try {
    if (!fs.existsSync(generatedDir)) {
      return res.json({ games: [] });
    }
    
    const files = fs.readdirSync(generatedDir)
      .filter(file => file.endsWith('.html'))
      .map(file => {
        const filePath = path.join(generatedDir, file);
        const stats = fs.statSync(filePath);
        
        // Extract requestId from filename (generated-{requestId}.html)
        const requestId = file.replace('generated-', '').replace('.html', '');
        
        // Find prompt and commandType from promptHistory
        let prompt = 'Unknown prompt';
        let commandType = 'create';
        const historyEntry = promptHistory.find(h => {
          if (typeof h === 'object' && h.requestId) {
            return h.requestId === requestId;
          }
          return false;
        });
        
        if (historyEntry && typeof historyEntry === 'object') {
          if (historyEntry.prompt) {
            prompt = historyEntry.prompt;
          }
          if (historyEntry.commandType) {
            commandType = historyEntry.commandType;
          }
        }
        
        return {
          name: file,
          url: `/generated/${file}`,
          date: stats.mtime.getTime(), // Return timestamp in milliseconds
          size: stats.size,
          requestId: requestId,
          prompt: prompt,
          commandType: commandType
        };
      })
      .sort((a, b) => b.date - a.date); // Sort by date (newest first)
    
    res.json({ games: files });
  } catch (error) {
    console.error('[API] Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

let promptHistory = [];
let requestQueue = [];
let isProcessing = false;
let currentRequestId = null;
let currentRequestData = null;
let activeRequests = new Map();
let modelResponses = new Map();

const aiModels = [
  { name: 'LLM', model: 'google/gemini-3-pro-preview' }
];

const systemPromptAutoPlay = `You are a creative web development assistant. You can generate interactive web pages, games, animations, and visual experiences using HTML, CSS, and JavaScript.

Respond ONLY with a valid JSON object in this exact format:
{
  "html": "<!DOCTYPE html><html><head><title>...</title></head><body>...</body></html>",
  "css": "body { margin: 0; padding: 0; }",
  "js": "document.addEventListener('DOMContentLoaded', function() { ... });"
}

IMPORTANT:
- The HTML must be a complete, valid HTML5 document starting with <!DOCTYPE html>
- The CSS should contain only the CSS rules (what goes inside <style> tags)
- The JS should contain only the JavaScript code (what goes inside <script> tags)
- You can create websites, games, animations, visualizations, or any interactive web experience
- Make it functional, modern, responsive, and match the user's request exactly
- Use best practices and clean code

CRITICAL - AUTO-PLAY REQUIREMENT:
- This content will be displayed automatically without user interaction
- Everything MUST start automatically when the page loads - NO user clicks, mouse movements, or keyboard input required
- Do NOT include:
  * Click events that require user clicks (buttons, menus, etc.)
  * Mouse move events that require user mouse movement
  * Keyboard events that require user keyboard input
  * Alert dialogs (no alert(), confirm(), prompt())
  * Form submissions or input fields that require user interaction
  * Any interactive elements that need mouse or keyboard actions to start
- Instead, use:
  * Auto-starting animations, games, or visual effects
  * Automatic game loops that run continuously
  * Self-playing games or demos
  * Auto-updating visualizations
  * Automatic behaviors that work immediately on page load
- Games should start automatically and play themselves or demonstrate gameplay
- Animations should begin immediately without user interaction
- All content should be fully functional and visually appealing without requiring any user input

RESPONSIVE DESIGN:
- The content MUST be fully responsive and adapt to different screen sizes
- Use CSS media queries, flexible layouts (flexbox/grid), relative units (%, vw, vh, rem, em)
- Ensure content scales properly and fits within the container
- Avoid fixed pixel widths that would cause horizontal scrolling or content overflow

SECURITY & PRIVACY:
- NEVER include code that displays or attempts to retrieve sensitive user information:
  * IP addresses (no IP lookup APIs, no IP display)
  * Geolocation data (no navigator.geolocation, no location APIs)
  * Browser fingerprinting (no detailed browser/device information collection)
  * Personal data (no user agent details beyond basic display needs)
- If a user requests sensitive data, create a placeholder/mockup instead that does not use real APIs`;

const systemPromptPC = `You are a creative web development assistant. You can generate interactive web pages, games, animations, and visual experiences using HTML, CSS, and JavaScript.

Respond ONLY with a valid JSON object in this exact format:
{
  "html": "<!DOCTYPE html><html><head><title>...</title></head><body>...</body></html>",
  "css": "body { margin: 0; padding: 0; }",
  "js": "document.addEventListener('DOMContentLoaded', function() { ... });"
}

IMPORTANT:
- The HTML must be a complete, valid HTML5 document starting with <!DOCTYPE html>
- The CSS should contain only the CSS rules (what goes inside <style> tags)
- The JS should contain only the JavaScript code (what goes inside <script> tags)
- You can create websites, games, animations, visualizations, or any interactive web experience
- Make it functional, modern, responsive, and match the user's request exactly
- Use best practices and clean code

CRITICAL - PC GAME REQUIREMENT:
- This is a PC game that REQUIRES mouse and keyboard interaction
- The game MUST require user interaction to play - NO AUTO-PLAY ALLOWED
- The game should NOT start automatically - it MUST wait for user input
- The game should NOT auto-play - it should wait for user input
- Do NOT include any auto-starting behaviors, animations, or game loops
- The game MUST require user interaction to play:
  * Mouse clicks for actions, selections, shooting, etc.
  * Mouse movement for aiming, navigation, dragging, etc.
  * Keyboard input for movement (WASD, arrow keys), actions, menus, etc.
  * Interactive UI elements (buttons, menus, inventory, etc.)
- Create engaging PC games like:
  * Action games (shooting, platformers, etc.)
  * Strategy games (tower defense, puzzles, etc.)
  * Adventure games (point-and-click, RPG elements, etc.)
  * Arcade games (requiring precise mouse/keyboard control)
- Include clear instructions on how to play
- Make controls intuitive and responsive
- Optimize for desktop/PC screen sizes

RESPONSIVE DESIGN:
- Optimize for desktop/PC screen sizes (typically 1920x1080 or larger)
- Use CSS media queries for different desktop resolutions
- Ensure the game is playable on standard PC monitors
- Avoid mobile-first design - focus on desktop experience

SECURITY & PRIVACY:
- NEVER include code that displays or attempts to retrieve sensitive user information:
  * IP addresses (no IP lookup APIs, no IP display)
  * Geolocation data (no navigator.geolocation, no location APIs)
  * Browser fingerprinting (no detailed browser/device information collection)
  * Personal data (no user agent details beyond basic display needs)
- If a user requests sensitive data, create a placeholder/mockup instead that does not use real APIs`;

const systemPromptMobile = `You are a creative web development assistant. You can generate interactive web pages, games, animations, and visual experiences using HTML, CSS, and JavaScript.

Respond ONLY with a valid JSON object in this exact format:
{
  "html": "<!DOCTYPE html><html><head><title>...</title></head><body>...</body></html>",
  "css": "body { margin: 0; padding: 0; }",
  "js": "document.addEventListener('DOMContentLoaded', function() { ... });"
}

IMPORTANT:
- The HTML must be a complete, valid HTML5 document starting with <!DOCTYPE html>
- The CSS should contain only the CSS rules (what goes inside <style> tags)
- The JS should contain only the JavaScript code (what goes inside <script> tags)
- You can create websites, games, animations, visualizations, or any interactive web experience
- Make it functional, modern, responsive, and match the user's request exactly
- Use best practices and clean code

CRITICAL - MOBILE GAME REQUIREMENT:
- This is a mobile game designed for touchscreen devices (smartphones, tablets)
- The game MUST use touch interactions:
  * Touch/tap events for actions, selections, shooting, etc.
  * Touch and drag for movement, swiping, drawing, etc.
  * Multi-touch support where appropriate (pinch, zoom, etc.)
  * Touch-friendly UI elements (large buttons, swipe gestures, etc.)
- The game should NOT auto-play - it should wait for user touch input
- Create engaging mobile games like:
  * Casual games (match-3, puzzles, endless runners, etc.)
  * Arcade games (tap to jump, swipe to move, etc.)
  * Drawing/art games (finger painting, etc.)
  * Strategy games optimized for touch
- Include clear instructions on how to play
- Make touch controls intuitive and responsive
- Optimize for mobile screen sizes (portrait and landscape)

RESPONSIVE DESIGN:
- MUST be fully responsive and optimized for mobile devices
- Use CSS media queries for mobile screen sizes (typically 375px to 768px width)
- Use flexible layouts (flexbox/grid), relative units (%, vw, vh, rem, em)
- Ensure touch targets are at least 44x44px for easy tapping
- Optimize for both portrait and landscape orientations
- Avoid fixed pixel widths that would cause horizontal scrolling
- Test on common mobile screen sizes

SECURITY & PRIVACY:
- NEVER include code that displays or attempts to retrieve sensitive user information:
  * IP addresses (no IP lookup APIs, no IP display)
  * Geolocation data (no navigator.geolocation, no location APIs)
  * Browser fingerprinting (no detailed browser/device information collection)
  * Personal data (no user agent details beyond basic display needs)
- If a user requests sensitive data, create a placeholder/mockup instead that does not use real APIs`;

function getSystemPrompt(command) {
  if (command === 'pc') {
    return systemPromptPC;
  } else if (command === 'mobile') {
    return systemPromptMobile;
  } else {
    return systemPromptAutoPlay; // Default for !create
  }
}

function cleanupOldGeneratedFiles(maxFiles = 20) {
  try {
    if (!fs.existsSync(generatedDir)) {
      return;
    }
    
    const files = fs.readdirSync(generatedDir)
      .filter(file => file.endsWith('.html'))
      .map(file => {
        const filePath = path.join(generatedDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          mtime: stats.mtime.getTime()
        };
      })
      .sort((a, b) => a.mtime - b.mtime); // Sort by modification time (oldest first)
    
    // If we have more than maxFiles, delete the oldest ones
    if (files.length >= maxFiles) {
      const filesToDelete = files.slice(0, files.length - maxFiles + 1);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`[Cleanup] Deleted old file: ${file.name}`);
        } catch (error) {
          console.error(`[Cleanup] Error deleting ${file.name}:`, error.message);
        }
      });
    }
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error.message);
  }
}

function buildFullHtml(html, css, js) {
  // If HTML already contains DOCTYPE, use it as is but inject CSS and JS
  if (html.trim().toLowerCase().startsWith('<!doctype') || html.trim().toLowerCase().startsWith('<html')) {
    let fullHtml = html;
    
    // Inject CSS if not already in HTML
    if (css && !fullHtml.includes('<style>') && !fullHtml.includes('</style>')) {
      const headEndIndex = fullHtml.indexOf('</head>');
      if (headEndIndex !== -1) {
        fullHtml = fullHtml.substring(0, headEndIndex) + 
          `<style>\n${css}\n</style>\n` + 
          fullHtml.substring(headEndIndex);
      } else {
        // No </head> found, try to inject before </html>
        const htmlEndIndex = fullHtml.indexOf('</html>');
        if (htmlEndIndex !== -1) {
          fullHtml = fullHtml.substring(0, htmlEndIndex) + 
            `<head><style>\n${css}\n</style></head>` + 
            fullHtml.substring(htmlEndIndex);
        } else {
          // No structure found, prepend
          fullHtml = `<!DOCTYPE html><html><head><style>\n${css}\n</style></head><body>${fullHtml}</body></html>`;
        }
      }
    }
    
    // Inject JS if not already in HTML
    if (js && !fullHtml.includes('<script>') && !fullHtml.includes('</script>')) {
      const bodyEndIndex = fullHtml.indexOf('</body>');
      if (bodyEndIndex !== -1) {
        fullHtml = fullHtml.substring(0, bodyEndIndex) + 
          `<script>\n${js}\n</script>\n` + 
          fullHtml.substring(bodyEndIndex);
      } else {
        // No </body> found, try before </html>
        const htmlEndIndex = fullHtml.indexOf('</html>');
        if (htmlEndIndex !== -1) {
          fullHtml = fullHtml.substring(0, htmlEndIndex) + 
            `<script>\n${js}\n</script>` + 
            fullHtml.substring(htmlEndIndex);
        } else {
          // Append at the end
          fullHtml += `<script>\n${js}\n</script>`;
        }
      }
    }
    
    return fullHtml;
  } else {
    // HTML is just a fragment, wrap it
    let fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Content</title>`;
    
    if (css) {
      fullHtml += `\n    <style>\n${css}\n    </style>`;
    }
    
    fullHtml += `\n</head>
<body>
    ${html}`;
    
    if (js) {
      fullHtml += `\n    <script>\n${js}\n    </script>`;
    }
    
    fullHtml += `\n</body>
</html>`;
    
    return fullHtml;
  }
}

async function processRequest(socket, prompt, requestId, commandType = 'create') {
  isProcessing = true;
  currentRequestId = requestId;
  
  const startTime = Date.now();
  const modelTimers = {};
  const modelStartTimes = {};
  let completedCount = 0;
  
  currentRequestData = {
    requestId,
    prompt,
    startTime,
    status: 'processing',
    completedCount: 0,
    commandType: commandType
  };
  
  activeRequests.set(requestId, currentRequestData);
  
  io.emit('request_started', { requestId, prompt, commandType });
  io.emit('queue_update', { queueLength: requestQueue.length });
  io.emit('ai_log_countdown_start', { requestId, prompt, totalSeconds: 60 });
  io.emit('ai_log', { text: `> Analyzing prompt: "${prompt}"\n> Initializing AI model...\n\n` });
  
  let countdownSeconds = 60;
  const aiLogCountdownInterval = setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds >= 0) {
      io.emit('ai_log_countdown_update', { requestId, seconds: countdownSeconds, prompt });
    } else {
      clearInterval(aiLogCountdownInterval);
    }
  }, 1000);
  
  setTimeout(() => {
    clearInterval(aiLogCountdownInterval);
  }, 61000);
  
  promptHistory.push({ prompt, requestId, timestamp: Date.now(), commandType });
  if (promptHistory.length > 50) {
    promptHistory.shift();
  }
  
  io.emit('prompt_added', { prompt, requestId, status: 'processing', commandType });
  
  aiModels.forEach((aiModel, index) => {
    modelStartTimes[aiModel.name] = Date.now();
    io.emit('model_start', { model: aiModel.name, index, requestId });
  });
  
  io.emit('ai_log', { text: `> Initializing neural network architecture...\n> Loading transformer model weights...\n> Establishing API connection...\n\n` });
  
  const technicalMessages = [
    'Tokenizing input sequence...',
    'Encoding prompt into embedding space...',
    'Initializing attention mechanism...',
    'Computing query-key-value matrices...',
    'Applying positional encoding...',
    'Processing through transformer layers...',
    'Calculating attention weights...',
    'Aggregating multi-head attention...',
    'Normalizing layer outputs...',
    'Applying feed-forward networks...',
    'Computing residual connections...',
    'Sampling from probability distribution...',
    'Generating token candidates...',
    'Applying temperature scaling...',
    'Filtering low-probability tokens...',
    'Building context window...',
    'Updating hidden states...',
    'Computing next token probabilities...',
    'Selecting top-k candidates...',
    'Applying nucleus sampling...',
    'Validating token sequence...',
    'Encoding output tokens...',
    'Formatting JSON structure...',
    'Validating JSON syntax...',
    'Extracting HTML components...',
    'Parsing CSS rules...',
    'Analyzing JavaScript syntax...',
    'Optimizing code structure...',
    'Validating HTML5 compliance...',
    'Checking CSS specificity...',
    'Verifying JavaScript execution...',
    'Building DOM structure...',
    'Applying style rules...',
    'Initializing event handlers...',
    'Validating responsive design...',
    'Checking cross-browser compatibility...',
    'Optimizing asset loading...',
    'Compressing output data...',
    'Finalizing code generation...',
    'Preparing response payload...',
    'Streaming response chunks...',
    'Buffering output data...',
    'Validating stream integrity...',
    'Reconstructing JSON payload...',
    'Parsing response structure...',
    'Extracting code components...',
    'Validating HTML structure...',
    'Checking CSS validity...',
    'Verifying JavaScript syntax...',
    'Sanitizing output content...',
    'Applying security filters...',
    'Finalizing code blocks...',
    'Preparing preview content...',
    'Validating sandbox constraints...',
    'Optimizing rendering performance...',
    'Checking memory allocation...',
    'Validating resource limits...',
    'Finalizing output format...',
    'Preparing delivery...',
    'Completing generation process...'
  ];

  for (const aiModel of aiModels) {
    const index = aiModels.indexOf(aiModel);
    const modelStartTime = modelStartTimes[aiModel.name];
    
    let messageIndex = 0;
    const maxMessages = Math.min(technicalMessages.length, 60);
    
    const countdownInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - modelStartTime) / 1000);
      
      if (elapsed < maxMessages && messageIndex < technicalMessages.length) {
        io.emit('ai_log', { text: `> ${technicalMessages[messageIndex]}\n`, append: true });
        messageIndex++;
      } else if (elapsed >= maxMessages) {
        clearInterval(countdownInterval);
      }
    }, 1000);
    
    modelTimers[aiModel.name] = countdownInterval;
    
    try {
      const requestOptions = {
        model: aiModel.model,
        messages: [
          { role: 'system', content: getSystemPrompt(commandType) },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: true,
        response_format: { type: 'json_object' }
      };
      
      let streamedContent = '';
      let isFirstChunk = true;
      
      const stream = await openrouter.chat.completions.create(requestOptions);
      
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          streamedContent += delta;
        }
      }
      
      if (modelTimers[aiModel.name]) {
        clearInterval(modelTimers[aiModel.name]);
        delete modelTimers[aiModel.name];
      }
      
      const modelEndTime = Date.now();
      const duration = ((modelEndTime - modelStartTime) / 1000).toFixed(2);
      
      io.emit('ai_log', { text: `> Stream transmission completed\n> Received ${streamedContent.length} bytes\n> Parsing JSON structure...\n`, append: true });
      
      let responseText = streamedContent.trim();
      
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        responseText = responseText.substring(jsonStart, jsonEnd + 1);
      }
      
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let content;
      try {
        content = JSON.parse(responseText);
      } catch (parseError) {
        io.emit('ai_log', { text: `> JSON parsing error detected\n> Attempting recovery...\n> Cleaning malformed characters...\n`, append: true });
        
        responseText = responseText.replace(/[^\x20-\x7E\n\r\t]/g, '');
        responseText = responseText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        
        const cleanJsonStart = responseText.indexOf('{');
        const cleanJsonEnd = responseText.lastIndexOf('}');
        
        if (cleanJsonStart !== -1 && cleanJsonEnd !== -1 && cleanJsonEnd > cleanJsonStart) {
          responseText = responseText.substring(cleanJsonStart, cleanJsonEnd + 1);
        }
        
        try {
          content = JSON.parse(responseText);
          io.emit('ai_log', { text: `> Recovery successful\n> JSON structure validated\n`, append: true });
        } catch (recoveryError) {
          throw parseError;
        }
      }
      
      io.emit('ai_log', { text: `> JSON parsing completed\n> Extracting code components...\n> HTML: ${content.html ? content.html.length : 0} chars\n> CSS: ${content.css ? content.css.length : 0} chars\n> JS: ${content.js ? content.js.length : 0} chars\n` });
      
      completedCount++;
      
      const modelResponse = {
        model: aiModel.name,
        index,
        html: content.html || '',
        css: content.css || '',
        js: content.js || '',
        duration: duration,
        requestId: requestId
      };
      
      if (!modelResponses.has(requestId)) {
        modelResponses.set(requestId, {});
      }
      modelResponses.get(requestId)[aiModel.name] = modelResponse;
      
      io.emit('model_response', modelResponse);
      
      io.emit('ai_log', { text: `> Code generation completed\n> Total processing time: ${duration}s\n> Output ready for preview\n\n`, append: true });
      
      // Save HTML file when all models complete
      if (completedCount === 1) {
        try {
          // Cleanup old files before saving new one (keep max 20 files)
          cleanupOldGeneratedFiles(20);
          
          const fullHtml = buildFullHtml(content.html || '', content.css || '', content.js || '');
          const fileName = `generated-${requestId}.html`;
          const filePath = path.join(generatedDir, fileName);
          fs.writeFileSync(filePath, fullHtml, 'utf8');
          const fileUrl = `/generated/${fileName}`;
          
          io.emit('generated_file_url', { requestId, url: fileUrl });
          io.emit('ai_log', { text: `> File saved: ${fileName}\n> URL: ${fileUrl}\n\n`, append: true });
        } catch (fileError) {
          console.error('[File Save Error]', fileError);
          io.emit('ai_log', { text: `> File save error: ${fileError.message}\n\n`, append: true });
        }
      }
      
      if (completedCount === 1) {
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        if (currentRequestData) {
          currentRequestData.status = 'completed';
          currentRequestData.duration = totalDuration;
        }
        io.emit('request_completed', { requestId, duration: totalDuration });
        io.emit('ai_log', { text: `> Model completed in ${totalDuration}s. Starting 10s countdown...\n\n`, append: true });
        
        let countdown = 10;
        const countdownInterval = setInterval(() => {
          io.emit('countdown_update', { requestId, seconds: countdown });
          countdown--;
          
          if (countdown < 0) {
            clearInterval(countdownInterval);
            finishRequest();
          }
        }, 1000);
      }
    } catch (error) {
      if (modelTimers[aiModel.name]) {
        clearInterval(modelTimers[aiModel.name]);
        delete modelTimers[aiModel.name];
      }
      const modelEndTime = Date.now();
      const duration = ((modelEndTime - modelStartTime) / 1000).toFixed(2);
      console.error(`Error with LLM:`, error);
      
      completedCount++;
      const errorMsg = error.message || error.toString() || 'Failed to generate code';
      const errorPreview = error.message || 'Unknown error';
      io.emit('ai_log', { text: `> Processing error detected\n> Error type: ${errorPreview}\n> Attempting recovery...\n> Duration: ${duration}s\n\n`, append: true });
      io.emit('model_error', { model: aiModel.name, index, error: errorMsg, duration, requestId });
      
      if (completedCount === 1) {
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        if (currentRequestData) {
          currentRequestData.status = 'completed';
          currentRequestData.duration = totalDuration;
        }
        io.emit('request_completed', { requestId, duration: totalDuration });
        io.emit('ai_log', { text: `> Model completed in ${totalDuration}s. Starting 10s countdown...\n\n`, append: true });
        
        let countdown = 10;
        const countdownInterval = setInterval(() => {
          io.emit('countdown_update', { requestId, seconds: countdown });
          countdown--;
          
          if (countdown < 0) {
            clearInterval(countdownInterval);
            finishRequest();
          }
        }, 1000);
      }
    }
  }
  
  io.emit('ai_log', { text: `> Model initialized and processing...\n\n` });
}

function finishRequest() {
  if (currentRequestId) {
    activeRequests.delete(currentRequestId);
  }
  isProcessing = false;
  currentRequestId = null;
  currentRequestData = null;
  
  if (requestQueue.length > 0) {
    const next = requestQueue.shift();
    io.emit('queue_update', { queueLength: requestQueue.length });
    processRequest(next.socket, next.prompt, next.requestId, next.commandType || 'create');
  } else {
    io.emit('queue_update', { queueLength: 0 });
    io.emit('countdown_update', { requestId: null, seconds: null });
  }
}

io.on('connection', (socket) => {
  console.log('User connected');

  socket.emit('test_input_mode', { enabled: TEST_INPUT });
  socket.emit('prompt_history', { history: promptHistory.map(h => typeof h === 'string' ? h : h.prompt) });
  socket.emit('queue_update', { queueLength: requestQueue.length });
  socket.emit('contract_address', { address: TOKEN_ADDRESS });
  socket.emit('project_description', { 
    description: 'Create the most unique and innovative games with Text to GameAI. Write your game idea in Pump.fun live chat and watch it come to life. Average completion time: 60 seconds. Transform your imagination into playable games instantly.'
  });
  
  if (currentTokenData) {
    socket.emit('marketCapUpdate', currentTokenData);
  }
  
  if (currentRequestId && currentRequestData) {
    socket.emit('request_started', { requestId: currentRequestId, prompt: currentRequestData.prompt, commandType: currentRequestData.commandType || 'create' });
    socket.emit('prompt_added', { prompt: currentRequestData.prompt, requestId: currentRequestId, status: currentRequestData.status, commandType: currentRequestData.commandType || 'create' });
    
    const responses = modelResponses.get(currentRequestId);
    if (responses) {
      Object.values(responses).forEach(response => {
        socket.emit('model_response', response);
      });
    }
    
    if (currentRequestData.status === 'completed') {
      socket.emit('request_completed', { requestId: currentRequestId, duration: currentRequestData.duration });
    }
  }
  
  activeRequests.forEach((data, reqId) => {
    if (reqId !== currentRequestId) {
      socket.emit('prompt_added', { prompt: data.prompt, requestId: reqId, status: data.status || 'completed', commandType: data.commandType || 'create' });
      
      const responses = modelResponses.get(reqId);
      if (responses) {
        Object.values(responses).forEach(response => {
          socket.emit('model_response', response);
        });
      }
      
      if (data.duration) {
        socket.emit('request_completed', { requestId: reqId, duration: data.duration });
      }
    }
  });

  socket.on('generate_code', (data) => {
    if (!data.prompt || data.prompt.trim() === '') {
      return; // Silently ignore empty prompts
    }

    // Process messages that start with !create, !pc, or !mobile
    const trimmedText = data.prompt.trim();
    let commandType = 'create';
    let promptText = '';
    
    if (trimmedText.toLowerCase().startsWith('!create')) {
      commandType = 'create';
      promptText = trimmedText.substring(7).trim(); // Remove "!create" (7 characters)
    } else if (trimmedText.toLowerCase().startsWith('!pc')) {
      commandType = 'pc';
      promptText = trimmedText.substring(3).trim(); // Remove "!pc" (3 characters)
    } else if (trimmedText.toLowerCase().startsWith('!mobile')) {
      commandType = 'mobile';
      promptText = trimmedText.substring(7).trim(); // Remove "!mobile" (7 characters)
    } else {
      return; // Silently ignore messages that don't start with !create, !pc, or !mobile
    }
    
    if (!promptText || promptText === '') {
      return; // Silently ignore empty prompts after command
    }

    if (filterSensitiveKeywords(promptText)) {
      socket.emit('ai_error', { message: 'Requests for sensitive information (IP, location, fingerprint) are not allowed for security reasons.' });
      return;
    }

    const sanitizedPrompt = sanitizeInput(promptText);
    if (!sanitizedPrompt) {
      return; // Silently ignore invalid prompts
    }

    const requestId = Date.now().toString();
    
    if (isProcessing) {
      requestQueue.push({ socket, prompt: sanitizedPrompt, requestId, commandType });
      io.emit('queue_update', { queueLength: requestQueue.length });
      io.emit('request_queued', { requestId, prompt: sanitizedPrompt, queuePosition: requestQueue.length, commandType });
    } else {
      io.emit('request_queued', { requestId, prompt: sanitizedPrompt, queuePosition: 0, commandType });
      processRequest(socket, sanitizedPrompt, requestId, commandType);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const TOKEN_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.TOKEN_ADDRESS;
const TEST_INPUT = process.env.TEST_INPUT === 'true';
const PUMPORTAL_API_KEY = process.env.PUMPORTAL_API_KEY;

let currentTokenData = null;

function startBirdeyeService() {
  if (!BIRDEYE_API_KEY || !TOKEN_ADDRESS) {
    console.log('[Birdeye] API key or token address not configured. Skipping Birdeye service.');
    return;
  }

  fetchInitialTokenData(BIRDEYE_API_KEY, TOKEN_ADDRESS).then(initialData => {
    if (initialData) {
      currentTokenData = { marketCap: initialData.marketCap, price: initialData.price };
      io.emit('marketCapUpdate', currentTokenData);
      console.log(`[Birdeye] Initial market cap: $${Math.floor(currentTokenData.marketCap).toLocaleString()}`);
    }
  });

  connectToBirdeye(BIRDEYE_API_KEY, TOKEN_ADDRESS);

  birdeyeEmitter.on('priceUpdate', (data) => {
    currentTokenData = { marketCap: data.marketCap, price: data.price };
    io.emit('marketCapUpdate', currentTokenData);
  });
}

function sanitizeInput(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

function filterSensitiveKeywords(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const lowerText = text.toLowerCase();
  
  const sensitiveKeywords = [
    'ip address', 'ipaddress',
    'location', 'geolocation', 'geo location',
    'fingerprint', 'browser fingerprint', 'device fingerprint',
    'navigator.geolocation', 'getcurrentposition', 'watchposition',
    'user agent', 'useragent',
    'ipify', 'ipapi', 'ip-api', 'ipinfo', 'ipgeolocation',
    'show ip', 'ip show', 'display ip', 'ip display'
  ];
  
  return sensitiveKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function startPumpFunChatService() {
  if (!TOKEN_ADDRESS) {
    console.log('[Pump.fun Chat] Token address not configured. Skipping Pump.fun Chat service.');
    return;
  }

  connectToPumpFunChat(TOKEN_ADDRESS);

  pumpFunChatEmitter.on('chatMessage', (msg) => {
    if (!msg.text || msg.text.trim() === '') {
      return; // Silently ignore empty messages
    }

    // Process messages that start with !create, !pc, or !mobile
    const trimmedText = msg.text.trim();
    let commandType = 'create';
    let promptText = '';
    
    if (trimmedText.toLowerCase().startsWith('!create')) {
      commandType = 'create';
      promptText = trimmedText.substring(7).trim(); // Remove "!create" (7 characters)
    } else if (trimmedText.toLowerCase().startsWith('!pc')) {
      commandType = 'pc';
      promptText = trimmedText.substring(3).trim(); // Remove "!pc" (3 characters)
    } else if (trimmedText.toLowerCase().startsWith('!mobile')) {
      commandType = 'mobile';
      promptText = trimmedText.substring(7).trim(); // Remove "!mobile" (7 characters)
    } else {
      return; // Silently ignore messages that don't start with !create, !pc, or !mobile
    }
    
    if (!promptText || promptText === '') {
      return; // Silently ignore empty prompts after command
    }

    if (filterSensitiveKeywords(promptText)) {
      console.log(`[Pump.fun Chat] Blocked sensitive request from ${msg.username}: ${promptText.substring(0, 50)}...`);
      return;
    }

    const sanitizedText = sanitizeInput(promptText);
    if (!sanitizedText) {
      return; // Silently ignore invalid prompts
    }

    const prompt = sanitizedText;
    const requestId = Date.now().toString();
    
    console.log(`[Pump.fun Chat] Received !${commandType} prompt from ${msg.username}: ${prompt}`);
    
    if (isProcessing) {
      requestQueue.push({ socket: null, prompt, requestId, commandType });
      io.emit('queue_update', { queueLength: requestQueue.length });
      io.emit('request_queued', { requestId, prompt, queuePosition: requestQueue.length });
    } else {
      io.emit('request_queued', { requestId, prompt, queuePosition: 0 });
      processRequest(null, prompt, requestId, commandType);
    }
  });
}

function startPumpPortalService() {
  if (!PUMPORTAL_API_KEY || !TOKEN_ADDRESS) {
    console.log('[PumpPortal] API key or token address not configured. Skipping PumpPortal service.');
    return;
  }

  connectToPumpPortal(PUMPORTAL_API_KEY, TOKEN_ADDRESS);

  pumpPortalEmitter.on('trade', (trade) => {
    io.emit('newTrade', trade);
    console.log(`[PumpPortal] Trade: ${trade.isBuy ? 'BUY' : 'SELL'} $${trade.usdValue?.toFixed(2) || 'N/A'}`);
  });
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`TEST_INPUT mode: ${TEST_INPUT ? 'enabled' : 'disabled'}`);
  startBirdeyeService();
  startPumpPortalService();
  
  if (!TEST_INPUT) {
    startPumpFunChatService();
  }
});

