// Default settings
const DEFAULT_SETTINGS = {
  scrollSpeed: 50,
  refreshInterval: 15,
  enableTicker: true
};

// Show status message
function showStatus(message, type = 'success') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.display = 'block';
  status.className = `status ${type}`;
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
    
    // Set input values
    document.getElementById('scrollSpeed').value = settings.scrollSpeed;
    document.getElementById('refreshInterval').value = settings.refreshInterval;
    document.getElementById('enableTicker').checked = settings.enableTicker;
    
    updateWarning();
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

// Save settings
async function saveSettings() {
  try {
    const scrollSpeed = parseInt(document.getElementById('scrollSpeed').value);
    const refreshInterval = parseInt(document.getElementById('refreshInterval').value);
    const enableTicker = document.getElementById('enableTicker').checked;
    
    // Validate inputs
    if (scrollSpeed < 1 || scrollSpeed > 100) {
      showStatus('Speed must be between 1 and 100', 'error');
      return;
    }
    
    if (refreshInterval < 5 || refreshInterval > 60) {
      showStatus('Refresh interval must be between 5 and 60 minutes', 'error');
      return;
    }
    
    // Get existing settings
    const result = await chrome.storage.local.get('settings');
    const existingSettings = result.settings || {};
    
    // Update settings
    const settings = { 
      ...existingSettings,
      scrollSpeed, 
      refreshInterval,
      enableTicker
    };
    
    // Save to storage
    await chrome.storage.local.set({ settings });
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings
    });
    
    showStatus('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

// Reset settings
async function resetSettings() {
  try {
    // Reset to default values
    document.getElementById('scrollSpeed').value = DEFAULT_SETTINGS.scrollSpeed;
    document.getElementById('refreshInterval').value = DEFAULT_SETTINGS.refreshInterval;
    document.getElementById('enableTicker').checked = DEFAULT_SETTINGS.enableTicker;
    
    updateWarning();
    await saveSettings();
    showStatus('Settings reset to default');
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus('Error resetting settings', 'error');
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Load current settings
  await loadSettings();
  
  // Add event listeners
  document.getElementById('saveButton').addEventListener('click', saveSettings);
  document.getElementById('resetButton').addEventListener('click', resetSettings);
  document.getElementById('refreshInterval').addEventListener('change', updateWarning);
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}); 