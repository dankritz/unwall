// DOM elements
const removePaywallBtn = document.getElementById('removePaywallBtn');
const quickRemoveBtn = document.getElementById('quickRemoveBtn');
const statusDiv = document.getElementById('status');
const settingsBtn = document.getElementById('settingsBtn');
const apiConfig = document.getElementById('apiConfig');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('model');
const saveBtn = document.getElementById('saveBtn');

// State
let isProcessing = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await checkApiConfiguration();
});

// Event listeners
removePaywallBtn.addEventListener('click', handleRemovePaywall);
quickRemoveBtn.addEventListener('click', handleQuickRemove);
settingsBtn.addEventListener('click', toggleSettings);
saveBtn.addEventListener('click', saveSettings);

// Toggle settings panel
function toggleSettings() {
    apiConfig.classList.toggle('show');
    settingsBtn.textContent = apiConfig.classList.contains('show') 
        ? '⚙️ Hide Configuration' 
        : '⚙️ API Configuration';
}

// Load saved settings
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['openRouterApiKey', 'aiModel']);
        
        if (result.openRouterApiKey) {
            apiKeyInput.value = result.openRouterApiKey;
        }
        
        if (result.aiModel) {
            modelSelect.value = result.aiModel;
        } else {
            // Default to Gemini 2.5 Flash
            modelSelect.value = 'google/gemini-2.5-flash';
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Save settings
async function saveSettings() {
    try {
        const apiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;
        
        if (!apiKey) {
            showStatus('Please enter an API key', 'error');
            return;
        }
        
        if (!selectedModel) {
            showStatus('Please select an AI model', 'error');
            return;
        }
        
        await chrome.storage.sync.set({
            openRouterApiKey: apiKey,
            aiModel: selectedModel
        });
        
        showStatus('Settings saved successfully!', 'success');
        setTimeout(() => {
            toggleSettings();
            checkApiConfiguration();
        }, 1000);
        
    } catch (error) {
        console.error('Failed to save settings:', error);
        showStatus('Failed to save settings', 'error');
    }
}

// Check API configuration
async function checkApiConfiguration() {
    try {
        const result = await chrome.storage.sync.get(['openRouterApiKey']);
        
        if (!result.openRouterApiKey) {
            showStatus('⚠️ API key required for AI removal. You can still use Quick Remove.', 'error');
            removePaywallBtn.disabled = true;
            quickRemoveBtn.disabled = false;
            return false;
        }
        
        removePaywallBtn.disabled = false;
        quickRemoveBtn.disabled = false;
        hideStatus();
        return true;
    } catch (error) {
        console.error('Failed to check API configuration:', error);
        return false;
    }
}

// Handle remove paywall
async function handleRemovePaywall() {
    if (isProcessing) return;
    
    const hasApiKey = await checkApiConfiguration();
    if (!hasApiKey) return;
    
    isProcessing = true;
    removePaywallBtn.disabled = true;
    
    try {
        showStatus('<span class="spinner"></span>Analyzing page...', 'loading');
        
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error('No active tab found');
        }
        
        // Check if we can access the tab
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            throw new Error('Cannot access Chrome internal pages');
        }
        
        showStatus('<span class="spinner"></span>Extracting page content...', 'loading');
        
        // Extract page HTML via content script
        const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'extractHTML' 
        });
        
        if (!response || !response.html) {
            throw new Error('Failed to extract page content. Try refreshing the page.');
        }
        
        showStatus('<span class="spinner"></span>Sending to AI for analysis...', 'loading');
        
        // Send to background script for AI processing
        const aiResponse = await chrome.runtime.sendMessage({
            action: 'processPaywall',
            html: response.html,
            url: tab.url
        });
        
        if (!aiResponse.success) {
            throw new Error(aiResponse.error || 'AI processing failed');
        }
        
        showStatus('<span class="spinner"></span>Executing paywall removal...', 'loading');
        
        // Execute the AI-generated instructions
        await chrome.tabs.sendMessage(tab.id, {
            action: 'executePaywallRemoval',
            instructions: aiResponse.instructions
        });
        
        showStatus('✅ Paywall removal completed! Content should be preserved. Check console for details.', 'success');
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
            hideStatus();
        }, 3000);
        
    } catch (error) {
        console.error('Failed to remove paywall:', error);
        showStatus(`❌ ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        removePaywallBtn.disabled = false;
    }
}

// Handle quick paywall removal (fallback strategies only)
async function handleQuickRemove() {
    if (isProcessing) return;
    
    isProcessing = true;
    quickRemoveBtn.disabled = true;
    removePaywallBtn.disabled = true;
    
    try {
        showStatus('<span class="spinner"></span>Running quick removal...', 'loading');
        
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error('No active tab found');
        }
        
        // Check if we can access the tab
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            throw new Error('Cannot access Chrome internal pages');
        }
        
        // Execute quick removal via content script
        await chrome.tabs.sendMessage(tab.id, {
            action: 'executeQuickRemoval'
        });
        
        showStatus('⚡ Quick removal completed! Content preserved, paywall elements targeted.', 'success');
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
            hideStatus();
        }, 3000);
        
    } catch (error) {
        console.error('Failed to run quick removal:', error);
        showStatus(`❌ ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        quickRemoveBtn.disabled = false;
        removePaywallBtn.disabled = false;
    }
}

// Show status message
function showStatus(message, type = 'info') {
    statusDiv.innerHTML = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
}

// Hide status message
function hideStatus() {
    statusDiv.style.display = 'none';
}

// Handle errors from content script or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showError') {
        showStatus(`❌ ${message.error}`, 'error');
        isProcessing = false;
        removePaywallBtn.disabled = false;
    }
});

// Handle extension installation/update
chrome.runtime.onInstalled?.addListener(() => {
    console.log('Unwall extension installed/updated');
}); 