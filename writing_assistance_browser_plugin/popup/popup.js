document.addEventListener('DOMContentLoaded', async () => {
  const configureBtn = document.getElementById('configure');
  const toggleBtn = document.getElementById('toggle');
  const statusDiv = document.getElementById('status');
  const usageSpan = document.getElementById('usage');

  // Check current status
  const settings = await getSettings();
  updateStatus(settings);

  configureBtn.onclick = () => {
    chrome.runtime.openOptionsPage();
  };

  toggleBtn.onclick = async () => {
    const enabled = await getEnabled();
    await setEnabled(!enabled);
    updateToggleButton(!enabled);
  };

  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['apiKey', 'provider'], resolve);
    });
  }

  async function getEnabled() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['enabled'], (result) => {
        resolve(result.enabled !== false);
      });
    });
  }

  async function setEnabled(enabled) {
    chrome.storage.sync.set({ enabled });
  }

  function updateStatus(settings) {
    if (settings.apiKey) {
      statusDiv.textContent = 'Ready';
      statusDiv.className = 'status active';
    } else {
      statusDiv.textContent = 'API key required';
      statusDiv.className = 'status inactive';
    }
  }

  async function updateToggleButton(enabled) {
    toggleBtn.textContent = enabled ? 'Disable Assistant' : 'Enable Assistant';
  }

  // Initialize toggle button
  updateToggleButton(await getEnabled());
});