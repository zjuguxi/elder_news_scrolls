// Function to counteract problematic global styles that might affect page scrolling
function ensurePageScrollability() {
  console.log('Elder News Scrolls: Applying scroll override styles.');
  if (document.documentElement) {
    document.documentElement.style.setProperty('overflow', 'auto', 'important');
    document.documentElement.style.setProperty('height', 'auto', 'important');
  }
  if (document.body) {
    document.body.style.setProperty('overflow', 'auto', 'important');
    document.body.style.setProperty('height', 'auto', 'important');
  }
}

// Apply scroll overrides as early as possible.
//DOMContentLoaded might be too late if styles.css is parsed and applied first.
ensurePageScrollability(); 
// Also ensure it runs again if the body is replaced or heavily modified by the page later.
// However, for typical well-behaved pages, running it once early should be sufficient.
// If pages dynamically re-apply `overflow:hidden` to body later, that's a harder problem
// not solvable by just one-time override.

// Default settings
const DEFAULT_SETTINGS = {
  scrollSpeed: 50,
  enableTicker: true
};

let currentSettings = DEFAULT_SETTINGS;
let currentHeadlines = []; // 存储当前的新闻数据

// Create and inject the ticker container element with Shadow DOM
function createTickerContainer() {
  let hostElement = document.getElementById('elder-news-ticker-host');
  if (hostElement) {
    // If host exists, assume shadow DOM and ticker area are also there
    return hostElement.shadowRoot.getElementById('elder-news-ticker-area');
  }

  // Create the host element for the Shadow DOM
  hostElement = document.createElement('div');
  hostElement.id = 'elder-news-ticker-host';
  document.body.appendChild(hostElement);

  // Attach Shadow DOM
  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // Create the ticker area div inside the Shadow DOM
  const tickerArea = document.createElement('div');
  tickerArea.id = 'elder-news-ticker-area'; // This ID is now inside the Shadow DOM
  tickerArea.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 30px; /* Or as defined by settings */
    background-color: #333; /* Or as defined by settings */
    z-index: 2147483647;
    overflow: hidden;
    display: ${currentSettings.enableTicker ? 'block' : 'none'};
  `;
  
  // Add styles for the ticker content and animation into the Shadow DOM
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .news-ticker-content {
      display: inline-block;
      white-space: nowrap;
      padding-left: 100%;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
      color: #ffffff; /* Default color, can be overridden */
      font-family: sans-serif; /* Basic font */
      font-size: 16px; /* Basic font size */
      line-height: 30px; /* Vertically center text */
    }
    @keyframes ticker {
      0% { transform: translateX(0); }
      100% { transform: translateX(-100%); }
    }
    .error-message {
      color: #ff4444 !important; /* Ensure error color overrides */
      cursor: pointer !important;
      text-decoration: underline !important;
    }
    /* Pause animation on hover over the ticker area */
    #elder-news-ticker-area:hover .news-ticker-content {
      animation-play-state: paused !important;
    }
  `;
  shadowRoot.appendChild(styleElement);
  shadowRoot.appendChild(tickerArea);
  
  return tickerArea; // This is the div inside Shadow DOM where content should be placed
}

// Create and inject the ticker content element
function createTicker() {
  console.log('Creating ticker element...');
  
  // 创建ticker容器 (this now returns the div inside shadow DOM)
  const tickerArea = createTickerContainer(); 
  
  const content = document.createElement('div');
  content.className = 'news-ticker-content';
  content.textContent = 'Loading news...';
  
  // 添加点击事件处理
  content.addEventListener('click', handleTickerClick);
  
  // Check if tickerArea (inside shadow DOM) already has news-ticker-content
  const existingContent = tickerArea.querySelector('.news-ticker-content');
  if (existingContent) {
    existingContent.remove(); // Remove to prevent duplicates if createTicker is called multiple times
  }
  
  tickerArea.appendChild(content);
  console.log('Ticker element created and added to page (inside shadow DOM)');
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

// New function to handle clicks on individual headline spans
function openArticleLink(event) {
  event.stopPropagation(); // Prevent bubbling to handleTickerClick if it's still on parent
  const url = event.currentTarget.dataset.url;
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// Update ticker content
// Receives either an array of article objects (articlesToDisplay) or an error string (errorText)
function updateTicker(data) {
  console.log('Updating ticker with data:', data);

  const hostElement = document.getElementById('elder-news-ticker-host');
  if (!hostElement || !hostElement.shadowRoot) {
    console.error('Shadow DOM host not found, cannot update ticker.');
    // Attempt to create the ticker if it's missing and we have articles.
    // This might happen if content script loaded after initial background messages.
    if (data.articles && data.articles.length > 0) {
        createTicker(); // This will setup host, shadow DOM, and ticker area
    } else {
        return; // Can't proceed without a host/shadowRoot
    }
  }
  
  const tickerArea = hostElement.shadowRoot.getElementById('elder-news-ticker-area');
  if (!tickerArea) {
    console.error('Ticker area within Shadow DOM not found.');
    return;
  }

  let contentElement = tickerArea.querySelector('.news-ticker-content');
  if (!contentElement) {
    // If content element doesn't exist, create it (it should have been created by createTicker)
    console.log('News ticker content element not found, creating it.');
    contentElement = document.createElement('div');
    contentElement.className = 'news-ticker-content';
    // Add the general click handler mainly for error messages now
    contentElement.addEventListener('click', handleTickerClick); 
    tickerArea.appendChild(contentElement);
  }

  contentElement.innerHTML = ''; // Clear previous content
  contentElement.classList.remove('error-message'); // Default to no error styling

  // Reset inline styles that might be set by error/info messages
  // The default styles are primarily driven by the .news-ticker-content class in Shadow DOM
  contentElement.style.color = ''; 
  contentElement.style.cursor = '';
  contentElement.style.textDecoration = '';

  if (data.errorText) { // Critical error message
    contentElement.textContent = data.errorText;
    contentElement.classList.add('error-message'); // This class applies red, underline, pointer
    currentHeadlines = []; 
  } else if (data.infoMessageText) { // Informational message (e.g., "No articles found")
    contentElement.textContent = data.infoMessageText;
    // Ensure no error styling is applied; default styling from .news-ticker-content class will take effect.
    // No specific class needed unless we want different styling for info messages.
    currentHeadlines = [];
  } else if (data.articles && data.articles.length > 0) { // Display headlines
    data.articles.forEach(article => {
      const headlineSpan = document.createElement('span');
      headlineSpan.className = 'news-headline';
      headlineSpan.textContent = `${article.emoji || '📰'} ${article.title}   ✧   `;
      headlineSpan.dataset.url = article.url;
      headlineSpan.dataset.title = article.title; 
      headlineSpan.addEventListener('click', openArticleLink);
      contentElement.appendChild(headlineSpan);
    });
    currentHeadlines = data.articles; 
  } else { // Fallback for empty articles array and no specific info/error message
    contentElement.textContent = 'No news to display.'; 
    currentHeadlines = [];
  }
  
  // Apply current scroll speed
  const duration = calculateDuration(currentSettings.scrollSpeed);
  contentElement.style.animationName = 'ticker'; 
  contentElement.style.animationDuration = `${duration}s`;
}

// Update settings
function updateSettings(newSettings) {
  currentSettings = { ...currentSettings, ...newSettings };
  
  const hostElement = document.getElementById('elder-news-ticker-host');
  if (!hostElement || !hostElement.shadowRoot) {
    // If ticker is being enabled and host doesn't exist, create it.
    if (currentSettings.enableTicker) {
        createTickerContainer(); // This sets up the host and shadow DOM
    } else {
        return; // Not enabled, and no host to update.
    }
  }
  
  const tickerArea = hostElement.shadowRoot.getElementById('elder-news-ticker-area');
   if (!tickerArea) { // Should not happen if createTickerContainer worked
    return;
  }
  
  tickerArea.style.display = currentSettings.enableTicker ? 'block' : 'none';
  
  const contentElement = tickerArea.querySelector('.news-ticker-content');
  if (contentElement) {
    const duration = calculateDuration(currentSettings.scrollSpeed);
    contentElement.style.animationName = 'ticker';
    contentElement.style.animationDuration = `${duration}s`;
  }
  
  if (!currentSettings.enableTicker) {
    const tickerContent = tickerArea?.querySelector('.news-ticker-content');
    if (tickerContent) {
      // Instead of removing, just clear its content and stop animation
      tickerContent.innerHTML = ''; 
      tickerContent.style.animationName = 'none'; 
    }
  }
}

// Simplified click handler, mainly for error messages now
function handleTickerClick(event) {
  event.stopPropagation();
  // If the clicked element itself (the content div) has error-message class
  if (event.currentTarget.classList.contains('error-message')) {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
  }
  // Individual headline clicks are handled by openArticleLink
}


// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.type === 'ERROR') {
    if (!document.getElementById('elder-news-ticker-host')?.shadowRoot?.getElementById('elder-news-ticker-area') && currentSettings.enableTicker) {
        createTicker();
    }
    updateTicker({ errorText: message.message });
  } else if (message.type === 'INFO_MESSAGE') { // Handle new info message type
    if (!document.getElementById('elder-news-ticker-host')?.shadowRoot?.getElementById('elder-news-ticker-area') && currentSettings.enableTicker) {
        createTicker();
    }
    updateTicker({ infoMessageText: message.message, articles: [] }); // Clear articles with info message
  } else if (message.type === 'UPDATE_HEADLINES') {
     if (!document.getElementById('elder-news-ticker-host')?.shadowRoot?.getElementById('elder-news-ticker-area') && currentSettings.enableTicker) {
        createTicker();
    }
    updateTicker({ articles: message.articles });
  } else if (message.type === 'UPDATE_SETTINGS') {
    updateSettings(message.settings);
  }
});

// Initialize
async function initialize() {
  const noArticlesInfoMessage = 'No articles found at the moment. Try again later.';
  try {
    const result = await chrome.storage.local.get(['settings', 'articles', 'error']);
    if (result.settings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...result.settings };
      updateSettings(currentSettings); 
    } else {
      updateSettings(DEFAULT_SETTINGS);
    }
    
    if (currentSettings.enableTicker) {
      let tickerArea = document.getElementById('elder-news-ticker-host')?.shadowRoot?.getElementById('elder-news-ticker-area');
      if (!tickerArea) {
        // createTicker also calls createTickerContainer and gets the tickerArea
        const contentElement = createTicker(); 
        tickerArea = contentElement.parentElement; // contentElement is appended to tickerArea
      }

      if (tickerArea) {
        if (result.error) {
          if (result.error === noArticlesInfoMessage) {
            updateTicker({ infoMessageText: result.error, articles: result.articles || [] });
          } else {
            updateTicker({ errorText: result.error });
          }
        } else if (result.articles && result.articles.length > 0) {
          updateTicker({ articles: result.articles });
        } else if (result.articles && result.articles.length === 0) {
          // This case handles if storage had empty articles and no specific "no articles" error.
          // The generic "No news to display" from updateTicker will be shown.
          updateTicker({ articles: [] });
        } else {
           // Default to loading or no news if nothing specific is found
          updateTicker({ infoMessageText: "Loading news..."});
        }
      }
    }
  } catch (err) {
    console.error('Error during initialization:', err);
    if (currentSettings.enableTicker) {
        // Attempt to create ticker and show an error if initialization failed badly
        createTicker(); // ensure container exists
        updateTicker({ errorText: "Error loading extension data." });
    }
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