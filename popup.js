// Default settings
const DEFAULT_SETTINGS = {
  scrollSpeed: 50,
  refreshInterval: 15
};

// Show status message
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.display = 'block';
  status.className = 'status ' + (isError ? 'error' : 'success');
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

// Update warning visibility
function updateWarning() {
  const refreshInterval = parseInt(document.getElementById('refreshInterval').value);
  const warning = document.getElementById('apiWarning');
  warning.style.display = refreshInterval === 5 ? 'block' : 'none';
}

// Load settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || DEFAULT_SETTINGS;
    document.getElementById('scrollSpeed').value = settings.scrollSpeed;
    document.getElementById('refreshInterval').value = settings.refreshInterval;
    updateWarning();
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', true);
  }
}

// Save settings
async function saveSettings() {
  try {
    const scrollSpeed = parseInt(document.getElementById('scrollSpeed').value);
    const refreshInterval = parseInt(document.getElementById('refreshInterval').value);
    
    // Validate scroll speed
    if (scrollSpeed < 1 || scrollSpeed > 100) {
      showStatus('Speed must be between 1 and 100', true);
      return;
    }
    
    const settings = { scrollSpeed, refreshInterval };
    
    // Save to storage
    await chrome.storage.local.set({ settings });
    
    // Notify all tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'UPDATE_SETTINGS',
          settings
        });
      } catch (err) {
        console.log('Could not update tab:', tab.id, err);
      }
    }
    
    // Notify background script to update refresh interval
    chrome.runtime.sendMessage({
      type: 'UPDATE_REFRESH_INTERVAL',
      interval: refreshInterval
    });
    
    showStatus('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', true);
  }
}

// Reset settings
async function resetSettings() {
  try {
    document.getElementById('scrollSpeed').value = DEFAULT_SETTINGS.scrollSpeed;
    document.getElementById('refreshInterval').value = DEFAULT_SETTINGS.refreshInterval;
    updateWarning();
    await saveSettings();
    showStatus('Settings reset to default');
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus('Error resetting settings', true);
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Load current settings
  loadSettings();
  
  // Add event listeners
  document.getElementById('saveButton').addEventListener('click', saveSettings);
  document.getElementById('resetButton').addEventListener('click', resetSettings);
  document.getElementById('refreshInterval').addEventListener('change', updateWarning);
}); 