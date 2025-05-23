// Default settings
const DEFAULT_SETTINGS = {
  scrollSpeed: 50,
  enableTicker: true
};

let currentSettings = DEFAULT_SETTINGS;
let currentHeadlines = []; // 存储当前的新闻数据

// 创建视口容器
function createViewportContainer() {
  // 检查是否已存在容器
  let container = document.getElementById('elder-news-container');
  if (container) {
    return container.querySelector('#elder-news-ticker-area');
  }

  // 创建主容器
  container = document.createElement('div');
  container.id = 'elder-news-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    z-index: 0;
  `;

  // 创建内容区域
  const contentArea = document.createElement('div');
  contentArea.id = 'elder-news-content';
  contentArea.style.cssText = `
    flex: 1;
    overflow: auto;
    position: relative;
  `;

  // 创建滚动框区域
  const tickerArea = document.createElement('div');
  tickerArea.id = 'elder-news-ticker-area';
  tickerArea.style.cssText = `
    height: 30px;
    background-color: #333;
    position: relative;
    overflow: hidden;
    display: ${currentSettings.enableTicker ? 'block' : 'none'};
  `;

  // 将原始body内容移动到contentArea
  while (document.body.firstChild) {
    contentArea.appendChild(document.body.firstChild);
  }

  // 组装容器
  container.appendChild(contentArea);
  container.appendChild(tickerArea);
  document.body.appendChild(container);

  return tickerArea;
}

// Create and inject the ticker element
function createTicker() {
  console.log('Creating ticker element...');
  
  // 创建视口容器并获取ticker区域
  const tickerArea = createViewportContainer();
  
  const content = document.createElement('div');
  content.className = 'news-ticker-content';
  content.textContent = 'Loading news...';
  
  // 添加点击事件处理
  content.addEventListener('click', handleTickerClick);
  
  tickerArea.appendChild(content);
  console.log('Ticker element created and added to page');
  return content;
}

// Calculate animation duration based on speed
function calculateDuration(speed) {
  // Convert speed (1-100) to duration (120-20 seconds)
  return 120 - (speed - 1) * (100 / 99);
}

// 处理点击事件
function handleTickerClick(event) {
  // 防止事件冒泡
  event.stopPropagation();
  
  // 如果是错误消息，打开选项页面
  if (event.target.classList.contains('error-message')) {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    return;
  }
  
  // 如果有新闻数据，打开对应的新闻链接
  if (currentHeadlines.length > 0) {
    // 获取点击位置相对于ticker的偏移量
    const tickerRect = event.target.getBoundingClientRect();
    const clickX = event.clientX - tickerRect.left;
    
    // 获取当前显示的文本内容
    const textContent = event.target.textContent;
    
    // 分割新闻项（考虑分隔符），保留空格
    const newsItems = textContent.split('✧').map(item => item.trim());
    
    // 计算每个新闻项的宽度
    const totalWidth = tickerRect.width;
    const newsCount = newsItems.length;
    const newsWidth = totalWidth / newsCount;
    
    // 计算点击位置对应的新闻索引
    const index = Math.floor(clickX / newsWidth);
    
    // 确保索引在有效范围内
    if (index >= 0 && index < newsItems.length) {
      // 获取点击位置对应的新闻文本
      const clickedNewsText = newsItems[index];
      
      // 在currentHeadlines中查找匹配的新闻
      const matchedArticle = currentHeadlines.find(article => {
        // 移除emoji和分隔符，只比较纯文本
        const cleanTitle = article.title.replace(/[^\w\s]/g, '').trim();
        const cleanClickedText = clickedNewsText.replace(/[^\w\s]/g, '').trim();
        return cleanTitle === cleanClickedText;
      });
      
      if (matchedArticle && matchedArticle.url) {
        window.open(matchedArticle.url, '_blank', 'noopener,noreferrer');
      }
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
    content.classList.add('error-message');
    content.style.color = '#ff4444';
    content.style.cursor = 'pointer';
    content.style.textDecoration = 'underline';
  } else {
    content.classList.remove('error-message');
    content.style.color = '#ffffff';
    content.style.cursor = 'default';
    content.style.textDecoration = 'none';
  }
  
  // Using textContent here is crucial for security as it prevents XSS vulnerabilities from potentially malicious API data.
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
  
  // 获取或创建容器
  const container = document.getElementById('elder-news-container') || createViewportContainer();
  const tickerArea = container.querySelector('#elder-news-ticker-area');
  
  // 更新ticker区域的显示状态
  if (tickerArea) {
    tickerArea.style.display = currentSettings.enableTicker ? 'block' : 'none';
  }
  
  // 更新动画速度
  const content = document.querySelector('.news-ticker-content');
  if (content) {
    const duration = calculateDuration(currentSettings.scrollSpeed);
    content.style.animation = `ticker ${duration}s linear infinite`;
  }
  
  // 如果禁用ticker，移除ticker内容
  if (!currentSettings.enableTicker) {
    const tickerContent = document.querySelector('.news-ticker-content');
    if (tickerContent) {
      tickerContent.remove();
    }
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
  // Load settings first
  try {
    const result = await chrome.storage.local.get(['settings', 'headlines', 'articles', 'error']);
    if (result.settings) {
      updateSettings(result.settings);
    }
    
    // Only create ticker if enabled
    if (currentSettings.enableTicker) {
      createTicker();
      
      if (result.error) {
        updateTicker(result.error, true);
      } else if (result.headlines) {
        updateTicker(result.headlines, false, result.articles || []);
      }
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