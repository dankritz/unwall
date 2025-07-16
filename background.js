// Background script for Unwall extension
console.log('Unwall background script loaded');

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message);
    
    if (message.action === 'processPaywall') {
        handleProcessPaywall(message, sendResponse);
        return true; // Keep message channel open for async response
    }
});

// Process paywall removal request
async function handleProcessPaywall(message, sendResponse) {
    try {
        const { html, url } = message;
        
        console.log('Processing paywall for URL:', url);
        console.log('HTML length:', html.length);
        
        // Get API configuration
        const config = await getApiConfig();
        if (!config.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }
        
        // Truncate HTML if too long (OpenRouter has token limits)
        const truncatedHtml = truncateHtml(html, 150000); // ~50k tokens roughly
        
        // Create the AI prompt
        const prompt = createPaywallRemovalPrompt(truncatedHtml, url);
        
        // Send request to OpenRouter
        const aiResponse = await callOpenRouterAPI(config, prompt);
        
        // Extract and validate JSON instructions from response
        const instructions = extractJSONInstructions(aiResponse);
        
        console.log('AI generated instructions:', instructions);
        console.log('Raw AI response:', aiResponse);
        
        sendResponse({
            success: true,
            instructions: instructions,
            url: url,
            rawResponse: aiResponse
        });
        
    } catch (error) {
        console.error('Failed to process paywall:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// Get API configuration from storage
async function getApiConfig() {
    try {
        const result = await chrome.storage.sync.get(['openRouterApiKey', 'aiModel']);
        return {
            apiKey: result.openRouterApiKey,
            model: result.aiModel || 'google/gemini-2.5-flash'  // Default to Gemini 2.5 Flash
        };
    } catch (error) {
        console.error('Failed to get API config:', error);
        throw new Error('Failed to load API configuration');
    }
}

// Truncate HTML to fit within token limits
function truncateHtml(html, maxLength) {
    if (html.length <= maxLength) {
        return html;
    }
    
    // Try to keep the head and body structure
    const headMatch = html.match(/<head[^>]*>[\s\S]*?<\/head>/i);
    const bodyMatch = html.match(/<body[^>]*>[\s\S]*?<\/body>/i);
    
    let truncated = '';
    
    if (headMatch) {
        truncated += headMatch[0] + '\n';
    }
    
    if (bodyMatch) {
        const remainingLength = maxLength - truncated.length;
        const bodyContent = bodyMatch[0];
        
        if (bodyContent.length > remainingLength) {
            // Truncate body content but keep opening and closing tags
            const bodyOpenMatch = bodyContent.match(/^<body[^>]*>/i);
            const bodyOpen = bodyOpenMatch ? bodyOpenMatch[0] : '<body>';
            
            const contentLength = remainingLength - bodyOpen.length - '</body>'.length - 100; // Leave some buffer
            const bodyInner = bodyContent.substring(bodyOpen.length, bodyOpen.length + contentLength);
            
            truncated += bodyOpen + bodyInner + '...</body>';
        } else {
            truncated += bodyContent;
        }
    } else {
        // No body tag found, just truncate everything
        truncated = html.substring(0, maxLength);
    }
    
    console.log(`Truncated HTML from ${html.length} to ${truncated.length} characters`);
    return truncated;
}

// Create the prompt for paywall removal
function createPaywallRemovalPrompt(html, url) {
    return `You are an expert web developer specialized in removing paywalls and subscription barriers. Analyze this webpage and return ONLY a JSON object with specific instructions for removing paywall elements.

URL: ${url}

HTML Content:
\`\`\`html
${html}
\`\`\`

CRITICAL: Return ONLY a valid JSON object with this structure:

{
  "removeElements": ["selector1", "selector2", "..."],
  "hideElements": ["selector1", "selector2", "..."],
  "removeClasses": ["class1", "class2", "..."],
  "restoreScroll": true,
  "removeBlur": true,
  "expandContent": true,
  "removeHighZIndex": true,
  "showHiddenContent": ["selector1", "selector2", "..."],
  "customStyles": [
    {"selector": "selector", "property": "property", "value": "value"},
    {"selector": "body", "property": "overflow", "value": "auto"}
  ],
  "removeTextElements": ["subscribe", "sign up", "premium", "continue reading"],
  "replaceTextContent": [
    {"selector": "selector", "find": "Subscribe to continue", "replace": ""}
  ]
}

ANALYSIS REQUIREMENTS:

1. **removeElements**: CSS selectors for overlays, modals, subscription prompts to completely remove
2. **hideElements**: CSS selectors for elements to hide (display: none)
3. **removeClasses**: Class names that restrict content access
4. **restoreScroll**: Set to true to enable scrolling 
5. **removeBlur**: Set to true to remove blur/opacity filters
6. **expandContent**: Set to true to remove height restrictions
7. **removeHighZIndex**: Set to true to remove high z-index overlays
8. **showHiddenContent**: Selectors for premium content to make visible
9. **customStyles**: Specific CSS property changes needed
10. **removeTextElements**: Text content patterns to find and remove elements containing them
11. **replaceTextContent**: Text replacements to make in element content

BE EXTREMELY AGGRESSIVE. Look for these paywall patterns:

**Visual Patterns:**
- Fixed/absolute positioned overlays with high z-index (>100)
- Elements with backdrop/overlay in class/id names
- Modals, popups, banners blocking content
- Gradient overlays or fade effects hiding text
- Blurred content areas (filter: blur)
- Content with reduced opacity or visibility
- Height restrictions on articles/content areas
- Scroll locks on body/html elements

**Text/Content Patterns:**
- Elements containing: "subscribe", "subscription", "sign up", "premium", "unlock", "continue reading", "become a member", "join now", "free trial", "upgrade", "pay", "billing"
- Call-to-action buttons and forms
- Newsletter signup prompts
- Social media follow prompts that block content

**Technical Patterns:**
- Elements with data attributes related to paywalls
- CSS classes containing: paywall, premium, subscriber, member, modal, overlay, popup, banner, gate, wall, block, restrict, limit
- JavaScript-generated content barriers
- Cookie/localStorage dependent content hiding

**Content Restoration:**
- Look for truncated articles with "..." or fade gradients
- Hidden paragraphs after preview sections
- Collapsed content sections
- Images or videos behind paywalls

Return ONLY the JSON object. No explanations, no code blocks, no markdown.`;
}

// Call OpenRouter API
async function callOpenRouterAPI(config, prompt) {
    try {
        console.log('Calling OpenRouter API with model:', config.model);
        
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'HTTP-Referer': 'https://unwall-extension.local',
                'X-Title': 'Unwall Chrome Extension'
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.1,
                top_p: 0.9,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API error:', response.status, errorText);
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('OpenRouter API response:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenRouter API');
        }
        
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('OpenRouter API call failed:', error);
        throw new Error(`AI API call failed: ${error.message}`);
    }
}

// Extract JSON instructions from AI response
function extractJSONInstructions(response) {
    try {
        // Remove markdown code blocks if present
        let jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Try to find JSON object in the response
        let startIndex = jsonStr.indexOf('{');
        let endIndex = jsonStr.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            jsonStr = jsonStr.substring(startIndex, endIndex + 1);
        }
        
        // Parse JSON
        const instructions = JSON.parse(jsonStr);
        
        // Validate required structure
        const requiredFields = ['removeElements', 'hideElements', 'removeClasses', 'restoreScroll', 'removeBlur', 'expandContent', 'removeHighZIndex', 'showHiddenContent', 'customStyles', 'removeTextElements', 'replaceTextContent'];
        
        for (const field of requiredFields) {
            if (!(field in instructions)) {
                console.warn(`Missing field: ${field}, setting default`);
                switch (field) {
                    case 'removeElements':
                    case 'hideElements':
                    case 'removeClasses':
                    case 'showHiddenContent':
                    case 'customStyles':
                    case 'removeTextElements':
                    case 'replaceTextContent':
                        instructions[field] = [];
                        break;
                    default:
                        instructions[field] = false;
                }
            }
        }
        
        console.log('Extracted and validated JSON instructions:', instructions);
        return instructions;
        
    } catch (error) {
        console.error('Failed to parse JSON instructions:', error);
        console.log('Raw response:', response);
        
        // Return fallback instructions
        return {
            removeElements: ['[class*="paywall"]', '[class*="subscription"]', '[class*="premium"]', '[class*="overlay"]', '[class*="modal"]'],
            hideElements: [],
            removeClasses: ['paywall', 'subscription', 'premium'],
            restoreScroll: true,
            removeBlur: true,
            expandContent: true,
            removeHighZIndex: true,
            showHiddenContent: ['[class*="premium-content"]', '[class*="subscriber-content"]'],
            customStyles: [
                {"selector": "body", "property": "overflow", "value": "auto"},
                {"selector": "html", "property": "overflow", "value": "auto"}
            ],
            removeTextElements: ['subscribe', 'subscription', 'sign up', 'premium', 'continue reading'],
            replaceTextContent: []
        };
    }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Unwall extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        console.log('Unwall extension installed for the first time');
    } else if (details.reason === 'update') {
        console.log('Unwall extension updated to version:', chrome.runtime.getManifest().version);
    }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
    console.log('Unwall extension startup');
});

console.log('Unwall background script initialized'); 