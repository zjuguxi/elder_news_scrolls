// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  scrollSpeed: 50,
  refreshInterval: 15,
  enableTicker: true // Default to enabled
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

// Validate API Key
async function validateApiKey(apiKey) {
  if (!apiKey) {
    return { valid: false, message: 'API Key is required' };
  }

  try {
    const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Chrome Extension'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return { 
        valid: false, 
        message: error.message || 'Invalid API Key'
      };
    }

    return { valid: true, message: 'API Key is valid' };
  } catch (error) {
    return { 
      valid: false, 
      message: 'Error validating API Key: ' + error.message 
    };
  }
}

// Update API status
function updateApiStatus(message, isError = false) {
  const status = document.getElementById('apiStatus');
  status.textContent = message;
  status.style.color = isError ? '#a94442' : '#3c763d';
}

// Load settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    // Ensure all DEFAULT_SETTINGS keys are present if settings are loaded
    const settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
    
    document.getElementById('apiKey').value = settings.apiKey || '';
    document.getElementById('scrollSpeed').value = settings.scrollSpeed;
    document.getElementById('refreshInterval').value = settings.refreshInterval;
    document.getElementById('enableTickerSwitch').checked = settings.enableTicker; 
    
    updateWarning();
    
    // Validate API Key if exists
    if (settings.apiKey) {
      const validation = await validateApiKey(settings.apiKey);
      updateApiStatus(validation.message, !validation.valid);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', true);
  }
}

// Save settings
async function saveSettings() {
  try {
    const apiKey = document.getElementById('apiKey').value.trim();
    const scrollSpeed = parseInt(document.getElementById('scrollSpeed').value);
    const refreshInterval = parseInt(document.getElementById('refreshInterval').value);
    const enableTicker = document.getElementById('enableTickerSwitch').checked;
    
    // Validate scroll speed
    if (scrollSpeed < 1 || scrollSpeed > 100) {
      showStatus('Speed must be between 1 and 100', true);
      return;
    }
    
    // Validate API Key
    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      showStatus(validation.message, true);
      updateApiStatus(validation.message, true);
      return;
    }
    
    const settings = { 
      apiKey,
      scrollSpeed, 
      refreshInterval,
      enableTicker // Include enableTicker state
    };
    
    // Save to storage
    await chrome.storage.local.set({ settings });
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings
    });
    
    showStatus('Settings saved successfully');
    updateApiStatus(validation.message);
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', true);
  }
}

// Reset settings
async function resetSettings() {
  try {
    document.getElementById('apiKey').value = DEFAULT_SETTINGS.apiKey;
    document.getElementById('scrollSpeed').value = DEFAULT_SETTINGS.scrollSpeed;
    document.getElementById('refreshInterval').value = DEFAULT_SETTINGS.refreshInterval;
    document.getElementById('enableTickerSwitch').checked = DEFAULT_SETTINGS.enableTicker;
    
    updateWarning();
    updateApiStatus('');
    
    // Explicitly save default settings, don't rely on saveSettings() to pick up from form during reset
    // because saveSettings() itself reads from the form, which might not be fully updated yet
    // or to avoid re-validating API key unnecessarily during a simple reset.
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: DEFAULT_SETTINGS
    });
    showStatus('Settings reset to default');
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus('Error resetting settings', true);
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  // Load current settings
  loadSettings();
  
  // Add event listeners
  document.getElementById('saveButton').addEventListener('click', saveSettings);
  document.getElementById('resetButton').addEventListener('click', resetSettings);
  document.getElementById('refreshInterval').addEventListener('change', updateWarning);
  
  // Add API Key validation on input
  document.getElementById('apiKey').addEventListener('input', async (e) => {
    const apiKey = e.target.value.trim();
    if (apiKey) {
      const validation = await validateApiKey(apiKey);
      updateApiStatus(validation.message, !validation.valid);
    } else {
      updateApiStatus('');
    }
  });
}); 