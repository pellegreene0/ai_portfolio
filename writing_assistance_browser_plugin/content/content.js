class WritingAssistant {
  constructor() {
    this.activeElement = null;
    this.suggestionBox = null;
    this.init();
  }

  init() {
    this.injectStyles();
    this.createSuggestionBox();
    this.setupEventListeners();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #writing-assistant-box {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        display: none;
      }

      #writing-assistant-box.wa-show {
        display: block;
      }

      .wa-header {
        padding: 12px 16px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
      }

      .wa-close {
        border: none;
        background: none;
        cursor: pointer;
        font-size: 16px;
        padding: 4px;
        color: #666;
      }

      .wa-close:hover {
        color: #000;
      }

      .wa-content {
        padding: 16px;
      }

      .wa-button {
        width: 100%;
        padding: 10px;
        margin-bottom: 8px;
        border: 1px solid #007cba;
        background: #007cba;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }

      .wa-button:hover {
        background: #005a8b;
      }

      .wa-button.success {
        background: #28a745;
        border-color: #28a745;
      }

      .wa-button.success:hover {
        background: #1e7e34;
      }

      .wa-loading {
        text-align: center;
        padding: 20px;
        color: #666;
      }

      .wa-suggestion {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 4px;
        margin: 10px 0;
        border-left: 3px solid #007cba;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .wa-button-group {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .wa-button-small {
        flex: 1;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        text-align: center;
      }

      .wa-apply {
        border: 1px solid #28a745;
        background: #28a745;
        color: white;
      }

      .wa-apply:hover {
        background: #1e7e34;
      }

      .wa-copy {
        border: 1px solid #6c757d;
        background: #6c757d;
        color: white;
      }

      .wa-copy:hover {
        background: #545b62;
      }

      .wa-error {
        color: #dc3545;
        text-align: center;
        padding: 20px;
        background: #f8d7da;
        border-radius: 4px;
        margin: 10px;
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    // Listen for focus on text inputs
    document.addEventListener('focusin', (e) => {
      if (this.isTextInput(e.target)) {
        this.activeElement = e.target;
        this.showAssistant();
      }
    });

    // Listen for focus out to potentially hide assistant
    document.addEventListener('focusout', (e) => {
      // Small delay to allow clicking on assistant buttons
      setTimeout(() => {
        if (!this.suggestionBox.contains(document.activeElement) &&
            !this.isTextInput(document.activeElement)) {
          this.hideAssistant();
        }
      }, 100);
    });

    // Listen for text selection
    document.addEventListener('mouseup', (e) => {
      // Don't trigger on assistant clicks
      if (this.suggestionBox && this.suggestionBox.contains(e.target)) {
        return;
      }

      setTimeout(() => {
        const selection = window.getSelection().toString().trim();
        if (selection.length > 10) {
          this.handleTextSelection(selection);
        }
      }, 10);
    });

    // Hide assistant when clicking outside
    document.addEventListener('click', (e) => {
      if (this.suggestionBox &&
          !this.suggestionBox.contains(e.target) &&
          !this.isTextInput(e.target)) {
        this.hideAssistant();
      }
    });
  }

  isTextInput(element) {
    if (!element) return false;

    const textInputTypes = ['textarea', 'input'];
    const isTextInput = textInputTypes.includes(element.tagName.toLowerCase());
    const isEditable = element.contentEditable === 'true';
    const isValidInput = element.type !== 'button' &&
                        element.type !== 'submit' &&
                        element.type !== 'checkbox' &&
                        element.type !== 'radio';

    return (isTextInput && isValidInput) || isEditable;
  }

  createSuggestionBox() {
    this.suggestionBox = document.createElement('div');
    this.suggestionBox.id = 'writing-assistant-box';
    document.body.appendChild(this.suggestionBox);
  }

  showAssistant() {
    if (!this.suggestionBox) return;

    this.suggestionBox.className = 'wa-show';
    this.suggestionBox.innerHTML = `
      <div class="wa-header">
        <strong>Writing Assistant</strong>
        <button class="wa-close" id="close-assistant">✕</button>
      </div>
      <div class="wa-content">
        <button id="improve-text" class="wa-button">Improve Selected Text</button>
        <button id="change-tone" class="wa-button success">Make More Professional</button>
      </div>
    `;

    // Add event listeners for buttons
    const closeBtn = document.getElementById('close-assistant');
    const improveBtn = document.getElementById('improve-text');
    const toneBtn = document.getElementById('change-tone');

    if (closeBtn) {
      closeBtn.onclick = () => this.hideAssistant();
    }

    if (improveBtn) {
      improveBtn.onclick = () => this.improveText();
    }

    if (toneBtn) {
      toneBtn.onclick = () => this.changeTone();
    }
  }

  hideAssistant() {
    if (this.suggestionBox) {
      this.suggestionBox.className = '';
    }
  }

  handleTextSelection(selection) {
    // Show assistant when text is selected
    this.showAssistant();
  }

  async improveText() {
    const selectedText = window.getSelection().toString().trim() ||
                        (this.activeElement ? this.activeElement.value : '');

    if (!selectedText) {
      this.showError('Please select some text or focus on a text field');
      return;
    }

    this.showLoading();

    try {
      const improved = await this.callLLMAPI(selectedText, 'improve');
      this.showSuggestion(improved);
    } catch (error) {
      console.error('Error improving text:', error);
      this.showError('Failed to get suggestions. Please try again.');
    }
  }

  async changeTone() {
    const selectedText = window.getSelection().toString().trim() ||
                        (this.activeElement ? this.activeElement.value : '');

    if (!selectedText) {
      this.showError('Please select some text or focus on a text field');
      return;
    }

    this.showLoading();

    try {
      const professional = await this.callLLMAPI(selectedText, 'professional');
      this.showSuggestion(professional);
    } catch (error) {
      console.error('Error changing tone:', error);
      this.showError('Failed to get suggestions. Please try again.');
    }
  }

  async callLLMAPI(text, type) {
    // Check if chrome.runtime is available
    if (!chrome || !chrome.runtime) {
      throw new Error('Chrome extension runtime not available');
    }

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'callLLM',
        text: text,
        type: type
      }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response ? response.error : 'Unknown error'));
        }
      });
    });
  }

  showLoading() {
    this.suggestionBox.innerHTML = `
      <div class="wa-header">
        <strong>Writing Assistant</strong>
        <button class="wa-close" id="close-assistant">✕</button>
      </div>
      <div class="wa-loading">
        <div>Getting suggestions...</div>
      </div>
    `;

    const closeBtn = document.getElementById('close-assistant');
    if (closeBtn) {
      closeBtn.onclick = () => this.hideAssistant();
    }
  }

  showSuggestion(suggestion) {
    this.suggestionBox.innerHTML = `
      <div class="wa-header">
        <strong>Suggestion</strong>
        <button class="wa-close" id="close-assistant">✕</button>
      </div>
      <div style="padding: 16px;">
        <div class="wa-suggestion">${this.escapeHtml(suggestion)}</div>
        <div class="wa-button-group">
          <button id="apply-suggestion" class="wa-button-small wa-apply">Apply</button>
          <button id="copy-suggestion" class="wa-button-small wa-copy">Copy</button>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById('close-assistant');
    const applyBtn = document.getElementById('apply-suggestion');
    const copyBtn = document.getElementById('copy-suggestion');

    if (closeBtn) {
      closeBtn.onclick = () => this.hideAssistant();
    }

    if (applyBtn) {
      applyBtn.onclick = () => this.applySuggestion(suggestion);
    }

    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(suggestion).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy:', err);
        });
      };
    }
  }

  applySuggestion(suggestion) {
    if (!this.activeElement) {
      this.showError('No active text field found');
      return;
    }

    const selection = window.getSelection();
    if (selection.toString().trim()) {
      // Replace selected text
      try {
        document.execCommand('insertText', false, suggestion);
      } catch (err) {
        // Fallback for contentEditable elements
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(suggestion));
      }
    } else {
      // Replace entire content
      if (this.activeElement.contentEditable === 'true') {
        this.activeElement.textContent = suggestion;
      } else {
        this.activeElement.value = suggestion;
      }

      // Trigger input event for frameworks like React
      const event = new Event('input', { bubbles: true });
      this.activeElement.dispatchEvent(event);
    }

    this.hideAssistant();
  }

  showError(message) {
    this.suggestionBox.innerHTML = `
      <div class="wa-header">
        <strong>Writing Assistant</strong>
        <button class="wa-close" id="close-assistant">✕</button>
      </div>
      <div class="wa-error">
        ${this.escapeHtml(message)}
      </div>
    `;

    const closeBtn = document.getElementById('close-assistant');
    if (closeBtn) {
      closeBtn.onclick = () => this.hideAssistant();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the writing assistant when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WritingAssistant();
  });
} else {
  new WritingAssistant();
}