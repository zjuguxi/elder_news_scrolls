const DEFAULT_REFRESH_INTERVAL = 15; // minutes

let refreshTimer = null;
let currentInterval = DEFAULT_REFRESH_INTERVAL;
let currentApiKey = '';

// 存储最新的articles array，用于新标签页加载时
let latestArticles = [];

// This will hold the categories loaded from news_categories.json
let loadedNewsCategories = {};

// 获取新闻分类
function getNewsCategory(title) {
  // Fallback if categories haven't loaded or are empty
  if (Object.keys(loadedNewsCategories).length === 0) {
    return '📰'; 
  }

  const lowerTitle = title.toLowerCase();
  
  // 遍历所有分类，查找匹配的关键词
  for (const [category, data] of Object.entries(loadedNewsCategories)) {
    if (data.keywords && data.keywords.some(keyword => lowerTitle.includes(keyword))) {
      return data.emoji;
    }
  }
  
  // 如果没有匹配的分类，返回默认emoji
  return '📰';
}

// Modifies the article object to add an emoji property.
function addEmojiToArticle(article) {
  article.emoji = getNewsCategory(article.title);
  return article; // Return the modified article
}

// 监听content script准备就绪的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTENT_SCRIPT_READY') {
    // Send the latest articles array if available
    if (latestArticles && latestArticles.length > 0) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'UPDATE_HEADLINES',
        articles: latestArticles // Send the array of articles
      }).catch(err => console.log('Error sending initial articles to tab:', err));
    }
  } else if (message.type === 'OPEN_OPTIONS') {
    // 打开选项页面
    chrome.runtime.openOptionsPage();
  }
});

async function fetchNews() {
  console.log('Fetching news...');
  
  // Check if we have a valid API Key
  if (!currentApiKey) {
    console.log('No API Key configured');
    const errorMessage = 'Please configure your NewsAPI Key in the extension settings.';
    
    // Store error message
    await chrome.storage.local.set({ error: errorMessage });
    
    // Send error to active tabs
    const tabs = await chrome.tabs.query({active: true});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'ERROR',
          message: errorMessage 
        });
      } catch (err) {
        console.log('Could not send error to tab:', tab.id, err);
      }
    }
    return;
  }

  try {
    const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Chrome Extension',
        'X-Api-Key': currentApiKey
      }
    });

    if (!response.ok) {
      // Attempt to parse error response from NewsAPI
      let apiErrorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          apiErrorMessage = errorData.message;
        }
      } catch (e) {
        // Could not parse JSON, use the HTTP status error
        console.error('Could not parse error response JSON:', e);
      }
      throw new Error(apiErrorMessage);
    }

    const data = await response.json();
    console.log('Received news data:', data);

    // Handle scenario where API returns success but no articles
    if (data.articles && data.articles.length === 0 || data.totalResults === 0) {
      console.log('No articles found in the API response.');
      const noArticlesMessage = 'No articles found at the moment. Try again later.';
      latestArticles = []; // Clear cache
      await chrome.storage.local.set({ 
        articles: [], // Ensure stored articles are cleared
        error: noArticlesMessage, // Store as an informational message/error
        lastUpdate: Date.now() 
      });
      
      const tabs = await chrome.tabs.query({active: true});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            type: 'INFO_MESSAGE', // Use a new type for non-critical info
            message: noArticlesMessage 
          });
        } catch (err) {
          console.log('Could not send "no articles" message to tab:', tab.id, err);
        }
      }
      return; // Exit fetchNews early
    }
    
    // Proceed if articles are found (original logic from here)
    if (data.articles && data.articles.length > 0) {
      const processedArticles = data.articles.slice(0, 10).map(article => addEmojiToArticle(article));
      console.log('Processed articles with emojis:', processedArticles);
      latestArticles = processedArticles;
      
      await chrome.storage.local.set({ 
        articles: processedArticles,
        lastUpdate: Date.now(),
        error: null 
      });
      console.log('Processed articles stored in local storage');
      
      const tabs = await chrome.tabs.query({active: true});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            type: 'UPDATE_HEADLINES',
            articles: processedArticles 
          });
          console.log('Message sent to tab:', tab.id);
        } catch (err) {
          console.log('Could not send to tab:', tab.id, err);
        }
      }
    } else { 
      // This else block might be redundant now due to the check above,
      // but kept for safety in case data.articles is null or undefined initially.
      throw new Error('No articles found in the response or response structure error.');
    }
  } catch (error) {
    console.error('Error fetching news:', error.message); 
    // The error.message here will be whatever was thrown:
    // - "HTTP error! status: ..."
    // - NewsAPI's specific message (e.g., "Your API key is invalid...")
    // - "No articles found..." (if that path is taken)
    const errorMessage = error.message; // Use the specific error message
    latestArticles = []; // Clear cache on error too
    await chrome.storage.local.set({ articles: [], error: errorMessage }); // Clear articles from storage
    
    const tabs = await chrome.tabs.query({active: true});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'ERROR', // Critical error
          message: errorMessage 
        });
      } catch (err) {
        console.log('Could not send critical error to tab:', tab.id, err);
      }
    }
  }
}

// Update refresh interval and restart timer
function updateRefreshInterval(minutes) {
  console.log('Updating refresh interval to', minutes, 'minutes');
  currentInterval = minutes;
  
  // Clear existing timer
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  
  // Set new timer
  const milliseconds = minutes * 60 * 1000;
  // Ensure fetchNews is defined before being used if it's part of a larger file
  // and potentially hoisted differently. For this example, it's fine.
  refreshTimer = setInterval(() => fetchNews().catch(console.error), milliseconds);
  
  // Fetch immediately
  fetchNews().catch(console.error);
}

// Main message listener for settings updates
// Note: The onMessage listener for CONTENT_SCRIPT_READY is defined earlier.
// Chrome allows multiple onMessage listeners.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_SETTINGS') {
    const { apiKey, refreshInterval } = message.settings;
    if (apiKey !== undefined) {
      currentApiKey = apiKey;
    }
    if (refreshInterval !== undefined) {
      updateRefreshInterval(refreshInterval);
    }
  }
});

// Initialize
async function initialize() {
  // Load news categories first
  try {
    const response = await fetch(chrome.runtime.getURL('news_categories.json'));
    if (!response.ok) {
      throw new Error(`Failed to fetch news_categories.json: ${response.statusText}`);
    }
    loadedNewsCategories = await response.json();
    console.log('News categories loaded successfully:', loadedNewsCategories);
  } catch (err) {
    console.error('Error loading news_categories.json:', err);
    // Fallback to an empty object or minimal default if loading fails
    loadedNewsCategories = {
      general: { emoji: '📰', keywords: [] } // Minimal fallback
    }; 
  }

  // Load saved settings, articles, and any stored error/info message
  try {
    const result = await chrome.storage.local.get(['settings', 'articles', 'error']);
    const settings = result.settings || { 
      apiKey: '',
      refreshInterval: DEFAULT_REFRESH_INTERVAL 
    };
    
    // If there are stored articles, they become the latestArticles.
    // If not, latestArticles remains empty array as initialized.
    if (result.articles && result.articles.length > 0) {
      latestArticles = result.articles;
    }
    // Note: A stored 'error' that is actually an info message (like "No articles...")
    // will be handled by content.js when it receives the initial data.
    // Background script primarily uses latestArticles for CONTENT_SCRIPT_READY.
    
    currentApiKey = settings.apiKey;
    updateRefreshInterval(settings.refreshInterval); 
  } catch (err) {
    console.error('Error during initialization:', err);
    updateRefreshInterval(DEFAULT_REFRESH_INTERVAL);
  }
}

// Start initialization
initialize();