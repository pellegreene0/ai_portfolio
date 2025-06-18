class APIManager {
  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'callLLM') {
        this.handleLLMRequest(request, sendResponse);
        return true; // Keep message channel open for async response
      }
    });
  }

  async handleLLMRequest(request, sendResponse) {
    try {
      const settings = await this.getSettings();
      const result = await this.callLLMAPI(request.text, request.type, settings);
      sendResponse({ success: true, result: result });
    } catch (error) {
      console.error('LLM Request Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['apiKey', 'provider', 'model'], (result) => {
        resolve({
          apiKey: result.apiKey || '',
          provider: result.provider || 'anthropic',
          model: result.model || 'claude-3-5-sonnet-20241022'
        });
      });
    });
  }

  async callLLMAPI(text, type, settings) {
    if (!settings.apiKey) {
      throw new Error('API key not configured. Please set up your API key in the extension settings.');
    }

    const prompts = {
      'improve': `Please improve the following text by making it clearer, more concise, and better structured. Keep the same meaning and tone. Only return the improved text without any additional commentary:\n\n${text}`,
      'professional': `Please rewrite the following text in a more professional tone while keeping the same meaning. Only return the rewritten text without any additional commentary:\n\n${text}`
    };

    const prompt = prompts[type] || prompts['improve'];

    if (settings.provider === 'openai') {
      return await this.callOpenAI(prompt, settings);
    } else if (settings.provider === 'anthropic') {
      return await this.callAnthropic(prompt, settings);
    } else {
      throw new Error(`Unsupported API provider: ${settings.provider}`);
    }
  }

  async callOpenAI(prompt, settings) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key in settings.');
        } else if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (response.status === 403) {
          throw new Error('API access forbidden. Please check your API key permissions.');
        }

        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw error;
    }
  }

  async callAnthropic(prompt, settings) {
    try {
      // Clean the API key
      const cleanApiKey = settings.apiKey.toString().trim();

      // Validate API key format
      if (!cleanApiKey.startsWith('sk-ant-')) {
        throw new Error('Invalid Anthropic API key format. API key should start with "sk-ant-"');
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': cleanApiKey,
        'anthropic-version': '2023-06-01'
      };

      // Add browser access header if needed (for browser extensions)
      if (typeof window !== 'undefined') {
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      }

      const body = {
        model: settings.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 401) {
          throw new Error('Invalid Anthropic API key. Please check your API key in settings.');
        } else if (response.status === 403) {
          throw new Error('API access forbidden. Please check your API key permissions.');
        } else if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(`Bad request: ${errorMessage}`);
        }

        throw new Error(`Anthropic API error: ${errorMessage}`);
      }

      const data = await response.json();

      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response format from Anthropic API');
      }

      return data.content[0].text.trim();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw error;
    }
  }
}

// Initialize the API manager
new APIManager();