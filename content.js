// Create and inject the ticker element
function createTicker() {
  console.log('Creating ticker element...');
  const ticker = document.createElement('div');
  ticker.className = 'news-ticker';
  ticker.style.zIndex = '999999';  // 确保显示在最上层
  
  const content = document.createElement('div');
  content.className = 'news-ticker-content';
  content.textContent = 'Loading news...';
  
  ticker.appendChild(content);
  document.body.appendChild(ticker);
  console.log('Ticker element created and added to page');
  return content;
}

// Update ticker content
function updateTicker(text, isError = false) {
  console.log('Updating ticker:', text, isError);
  let content = document.querySelector('.news-ticker-content');
  if (!content) {
    content = createTicker();
  }
  content.textContent = text;
  content.style.color = isError ? '#ff4444' : '#ffffff';
}

// Initialize ticker
async function initialize() {
  // 创建ticker
  createTicker();
  
  // 检查存储的数据
  const result = await chrome.storage.local.get(['headlines', 'error']);
  if (result.error) {
    updateTicker(result.error, true);
  } else if (result.headlines) {
    updateTicker(result.headlines);
  }
  
  // 通知background script我们已准备就绪
  try {
    await chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
    console.log('Sent ready message to background script');
  } catch (err) {
    console.log('Could not send ready message:', err);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.type === 'ERROR') {
    updateTicker(message.message, true);
  } else if (message.type === 'UPDATE_HEADLINES') {
    updateTicker(message.headlines);
  }
});

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
} 