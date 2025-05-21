const DEFAULT_REFRESH_INTERVAL = 15; // minutes

let refreshTimer = null;
let currentInterval = DEFAULT_REFRESH_INTERVAL;
let currentApiKey = '';

// 存储最新的headlines，用于新标签页加载时
let latestHeadlines = '';

// 监听content script准备就绪的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTENT_SCRIPT_READY') {
    if (latestHeadlines) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'UPDATE_HEADLINES',
        headlines: latestHeadlines
      }).catch(console.error);
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received news data:', data);
    
    if (data.articles && data.articles.length > 0) {
      const articles = data.articles.slice(0, 10);
      // Ensure that any display of these headlines in HTML contexts uses textContent or proper sanitization to prevent XSS.
      const headlines = articles
        .map(article => article.title)
        .join(' +++ ');
      
      console.log('Processed headlines:', headlines);
      
      // Store the headlines and articles
      await chrome.storage.local.set({ 
        headlines,
        articles,
        lastUpdate: Date.now(),
        error: null // Clear any previous errors
      });
      console.log('Headlines and articles stored in local storage');
      
      // Notify content script
      const tabs = await chrome.tabs.query({active: true});
      console.log('Found active tabs:', tabs.length);
      
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            type: 'UPDATE_HEADLINES',
            headlines,
            articles
          });
          console.log('Message sent to tab:', tab.id);
        } catch (err) {
          console.log('Could not send to tab:', tab.id, err);
        }
      }
    } else {
      throw new Error('No articles found in the response');
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    const errorMessage = 'Unable to fetch news. Please check your API Key and try again.';
    
    // Store error message
    await chrome.storage.local.set({ error: errorMessage });
    
    // Send error to active tabs only
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
  refreshTimer = setInterval(fetchNews, milliseconds);
  
  // Fetch immediately
  fetchNews();
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_SETTINGS') {
    const { apiKey, refreshInterval } = message.settings;
    currentApiKey = apiKey;
    updateRefreshInterval(refreshInterval);
  }
});

// Initialize
async function initialize() {
  // Load saved settings
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || { 
      apiKey: '',
      refreshInterval: DEFAULT_REFRESH_INTERVAL 
    };
    
    currentApiKey = settings.apiKey;
    updateRefreshInterval(settings.refreshInterval);
  } catch (err) {
    console.error('Error loading settings:', err);
    updateRefreshInterval(DEFAULT_REFRESH_INTERVAL);
  }
}

// Start initialization
initialize(); 