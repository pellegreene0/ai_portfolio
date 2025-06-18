document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settings-form');
  const providerSelect = document.getElementById('provider');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('model');
  const testButton = document.getElementById('test-api');
  const messageDiv = document.getElementById('message');

  // Load existing settings
  await loadSettings();

  // Update model options when provider changes
  providerSelect.addEventListener('change', updateModelOptions);

  // Save settings on form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
  });

  // Test API connection
  testButton.addEventListener('click', async () => {
    await testAPIConnection();
  });

  async function loadSettings() {
    const settings = await getStoredSettings();

    providerSelect.value = settings.provider || 'anthropic';
    apiKeyInput.value = settings.apiKey || '';

    // Update model options first, then set the model value
    updateModelOptions();

    // Set default model based on provider
    const defaultModels = {
      'anthropic': 'claude-3-5-sonnet-20241022',
      'openai': 'gpt-3.5-turbo'
    };

    modelSelect.value = settings.model || defaultModels[settings.provider || 'anthropic'];
  }

  async function getStoredSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['provider', 'apiKey', 'model'], resolve);
    });
  }

  function updateModelOptions() {
    const provider = providerSelect.value;
    modelSelect.innerHTML = '';

    const modelOptions = {
      'openai': [
        { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo (Recommended)' },
        { value: 'gpt-4o-mini', text: 'GPT-4o Mini (Faster, cheaper)' },
        { value: 'gpt-4o', text: 'GPT-4o (Most capable)' },
        { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
        { value: 'gpt-4', text: 'GPT-4' }
      ],
      'anthropic': [
        { value: 'claude-3-5-sonnet-20241022', text: 'Claude 3.5 Sonnet (Recommended)' },
        { value: 'claude-3-5-haiku-20241022', text: 'Claude 3.5 Haiku (Fastest, cheapest)' },
        { value: 'claude-3-opus-20240229', text: 'Claude 3 Opus (Most capable)' },
        { value: 'claude-3-sonnet-20240229', text: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', text: 'Claude 3 Haiku' }
      ]
    };

    const options = modelOptions[provider] || modelOptions['anthropic'];

    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      modelSelect.appendChild(optionElement);
    });

    // Set default selection if no current value
    if (!modelSelect.value && options.length > 0) {
      modelSelect.value = options[0].value;
    }
  }

  async function saveSettings() {
    const settings = {
      provider: providerSelect.value,
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value
    };

    // Validate API key
    if (!settings.apiKey) {
      showMessage('Please enter an API key', 'error');
      return;
    }

    // Validate API key format based on provider
    const validationResult = validateApiKey(settings.apiKey, settings.provider);
    if (!validationResult.valid) {
      showMessage(validationResult.message, 'error');
      return;
    }

    try {
      await chrome.storage.sync.set(settings);
      showMessage('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('Error saving settings: ' + error.message, 'error');
    }
  }

  function validateApiKey(apiKey, provider) {
    switch (provider) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return {
            valid: false,
            message: 'OpenAI API keys should start with "sk-"'
          };
        }
        break;
      case 'anthropic':
        if (!apiKey.startsWith('sk-ant-')) {
          return {
            valid: false,
            message: 'Anthropic API keys should start with "sk-ant-"'
          };
        }
        break;
    }
    return { valid: true };
  }

  async function testAPIConnection() {
    const settings = {
      provider: providerSelect.value,
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value
    };

    if (!settings.apiKey) {
      showMessage('Please enter an API key first', 'error');
      return;
    }

    // Validate API key format
    const validationResult = validateApiKey(settings.apiKey, settings.provider);
    if (!validationResult.valid) {
      showMessage(validationResult.message, 'error');
      return;
    }

    showMessage('Testing API connection...', 'info');
    testButton.disabled = true;
    testButton.textContent = 'Testing...';

    try {
      const testResult = await testAPI(settings);
      if (testResult.success) {
        showMessage(`✓ API connection successful! Response: "${testResult.response}"`, 'success');
      } else {
        showMessage('✗ API connection failed: ' + testResult.error, 'error');
      }
    } catch (error) {
      console.error('Error testing API:', error);
      showMessage('✗ Error testing API: ' + error.message, 'error');
    } finally {
      testButton.disabled = false;
      testButton.textContent = 'Test API Connection';
    }
  }

  async function testAPI(settings) {
    try {
      const testPrompt = "Please respond with exactly: 'API connection successful'";
      let response;

      switch (settings.provider) {
        case 'openai':
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
              model: settings.model,
              messages: [{ role: 'user', content: testPrompt }],
              max_tokens: 50,
              temperature: 0
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

            if (response.status === 401) {
              errorMessage = 'Invalid API key. Please check your OpenAI API key.';
            } else if (response.status === 429) {
              errorMessage = 'Rate limit exceeded. Please try again later.';
            } else if (response.status === 403) {
              errorMessage = 'API access forbidden. Check your API key permissions.';
            }

            return { success: false, error: errorMessage };
          }

          const openaiData = await response.json();
          if (!openaiData.choices || !openaiData.choices[0]) {
            return { success: false, error: 'Invalid response format from OpenAI' };
          }

          return {
            success: true,
            response: openaiData.choices[0].message.content.trim()
          };

        case 'anthropic':
          const cleanApiKey = settings.apiKey.toString().trim();

          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': cleanApiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: settings.model,
              max_tokens: 50,
              messages: [{ role: 'user', content: testPrompt }],
              temperature: 0
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

            if (response.status === 401) {
              errorMessage = 'Invalid API key. Please check your Anthropic API key.';
            } else if (response.status === 403) {
              errorMessage = 'API access forbidden. Check your API key permissions.';
            } else if (response.status === 429) {
              errorMessage = 'Rate limit exceeded. Please try again later.';
            }

            return { success: false, error: errorMessage };
          }

          const anthropicData = await response.json();
          if (!anthropicData.content || !anthropicData.content[0]) {
            return { success: false, error: 'Invalid response format from Anthropic' };
          }

          return {
            success: true,
            response: anthropicData.content[0].text.trim()
          };

        default:
          return { success: false, error: 'Unsupported provider: ' + settings.provider };
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return { success: false, error: 'Network error. Check your internet connection.' };
      }
      return { success: false, error: error.message };
    }
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;

    // Clear message after different durations based on type
    const duration = type === 'error' ? 8000 : type === 'success' ? 6000 : 4000;

    setTimeout(() => {
      if (messageDiv.textContent === text) { // Only clear if message hasn't changed
        messageDiv.textContent = '';
        messageDiv.className = '';
      }
    }, duration);
  }

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveSettings();
    }

    // Ctrl/Cmd + T to test API
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      if (!testButton.disabled) {
        testAPIConnection();
      }
    }
  });

  // Auto-save on input change (with debounce)
  let saveTimeout;
  function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (apiKeyInput.value.trim()) {
        saveSettings();
      }
    }, 2000);
  }

  apiKeyInput.addEventListener('input', debouncedSave);
  providerSelect.addEventListener('change', debouncedSave);
  modelSelect.addEventListener('change', debouncedSave);
});