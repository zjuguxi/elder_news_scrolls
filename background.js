const API_KEY = 'a91e2ede0df042e5ba465c78b188f261';
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

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
  }
});

async function fetchNews() {
  console.log('Fetching news...');
  try {
    const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${API_KEY}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Chrome Extension'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received news data:', data);
    
    if (data.articles && data.articles.length > 0) {
      const headlines = data.articles
        .slice(0, 10)
        .map(article => article.title)
        .join(' +++ ');
      
      console.log('Processed headlines:', headlines);
      latestHeadlines = headlines;
      
      // Store the headlines
      await chrome.storage.local.set({ headlines });
      console.log('Headlines stored in local storage');
      
      // Notify content script
      const tabs = await chrome.tabs.query({active: true});
      console.log('Found active tabs:', tabs.length);
      
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            type: 'UPDATE_HEADLINES',
            headlines 
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
    const errorMessage = 'Unable to fetch news. Please try again later.';
    
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

// Initial fetch
console.log('Starting initial news fetch...');
fetchNews();

// Set up periodic refresh
console.log('Setting up periodic refresh...');
setInterval(fetchNews, REFRESH_INTERVAL); 