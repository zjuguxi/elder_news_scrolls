// Default settings
const DEFAULT_SETTINGS = {
  scrollSpeed: 50
};

let currentSettings = DEFAULT_SETTINGS;
let currentHeadlines = []; // 存储当前的新闻数据

// Create and inject the ticker element
function createTicker() {
  console.log('Creating ticker element...');
  const ticker = document.createElement('div');
  ticker.className = 'news-ticker';
  ticker.style.zIndex = '999999';  // 确保显示在最上层
  
  const content = document.createElement('div');
  content.className = 'news-ticker-content';
  content.textContent = 'Loading news...';
  
  // 添加点击事件处理
  content.addEventListener('click', handleTickerClick);
  
  ticker.appendChild(content);
  document.body.appendChild(ticker);
  console.log('Ticker element created and added to page');
  return content;
}

// Calculate animation duration based on speed setting
function calculateDuration(speed) {
  // Convert speed (1-100) to duration (120-20 seconds)
  return 120 - (speed - 1) * (100 / 99);
}

// 处理点击事件
function handleTickerClick(event) {
  // 如果有新闻数据，打开第一条新闻的链接
  if (currentHeadlines.length > 0) {
    const firstArticle = currentHeadlines[0];
    if (firstArticle.url) {
      window.open(firstArticle.url, '_blank');
    }
  }
}

// Update ticker content
function updateTicker(text, isError = false, headlines = []) {
  console.log('Updating ticker:', text, isError);
  let content = document.querySelector('.news-ticker-content');
  if (!content) {
    content = createTicker();
  }
  
  // 如果是错误消息，添加特殊样式和点击事件
  if (isError) {
    content.style.color = '#ff4444';
    content.style.cursor = 'pointer';
    content.style.textDecoration = 'underline';
    content.onclick = () => {
      // 打开选项页面
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    };
  } else {
    content.style.color = '#ffffff';
    content.style.cursor = 'pointer';
    content.style.textDecoration = 'none';
    content.onclick = handleTickerClick;
  }
  
  content.textContent = text;
  
  // 存储新闻数据
  if (!isError && headlines.length > 0) {
    currentHeadlines = headlines;
  }
  
  // Apply current scroll speed
  const duration = calculateDuration(currentSettings.scrollSpeed);
  content.style.animation = `ticker ${duration}s linear infinite`;
}

// Update settings
function updateSettings(newSettings) {
  currentSettings = { ...currentSettings, ...newSettings };
  const content = document.querySelector('.news-ticker-content');
  if (content) {
    const duration = calculateDuration(currentSettings.scrollSpeed);
    content.style.animation = `ticker ${duration}s linear infinite`;
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.type === 'ERROR') {
    updateTicker(message.message, true);
  } else if (message.type === 'UPDATE_HEADLINES') {
    updateTicker(message.headlines, false, message.articles);
  } else if (message.type === 'UPDATE_SETTINGS') {
    updateSettings(message.settings);
  }
});

// Initialize
async function initialize() {
  // Create ticker
  createTicker();
  
  // Load settings
  try {
    const result = await chrome.storage.local.get(['settings', 'headlines', 'articles', 'error']);
    if (result.settings) {
      updateSettings(result.settings);
    }
    if (result.error) {
      updateTicker(result.error, true);
    } else if (result.headlines) {
      updateTicker(result.headlines, false, result.articles || []);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  
  // Notify background script we're ready
  try {
    await chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
    console.log('Sent ready message to background script');
  } catch (err) {
    console.log('Could not send ready message:', err);
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
} 