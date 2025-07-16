// Content script for Unwall extension
console.log('Unwall content script loaded');

// Helper function to safely get className as string
function getElementClassName(element) {
    return String(element.className || '');
}

// Helper function to safely get element id as string  
function getElementId(element) {
    return String(element.id || '');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.action === 'extractHTML') {
        handleExtractHTML(sendResponse);
        return true; // Keep message channel open for async response
    }
    
    if (message.action === 'executePaywallRemoval') {
        handleExecutePaywallRemoval(message.instructions, sendResponse);
        return true; // Keep message channel open for async response
    }
    
    if (message.action === 'executeQuickRemoval') {
        handleQuickRemoval(sendResponse);
        return true; // Keep message channel open for async response
    }
});

// Extract HTML content from the page
function handleExtractHTML(sendResponse) {
    try {
        // Get the full HTML of the page
        const html = document.documentElement.outerHTML;
        
        // Get additional page information
        const pageInfo = {
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname,
            html: html,
            timestamp: new Date().toISOString()
        };
        
        console.log('Extracted HTML length:', html.length);
        sendResponse({ success: true, ...pageInfo });
        
    } catch (error) {
        console.error('Failed to extract HTML:', error);
        sendResponse({ 
            success: false, 
            error: 'Failed to extract page content: ' + error.message 
        });
    }
}

// Execute paywall removal using JSON instructions
function handleExecutePaywallRemoval(instructions, sendResponse) {
    try {
        console.log('=== PAYWALL REMOVAL DEBUG ===');
        console.log('Instructions to execute:', instructions);
        
        // Validate the instructions
        if (!instructions || typeof instructions !== 'object') {
            throw new Error('Invalid instructions provided');
        }
        
        // Log current paywall elements before removal
        logCurrentPaywallElements();
        
        // Execute instructions safely
        const executeInstructions = () => {
            try {
                console.log('🤖 Starting AI-guided paywall removal...');
                
                // Check content before removal
                const contentBefore = document.querySelectorAll('article, main, .content, [class*="content"]').length;
                console.log(`Content elements before removal: ${contentBefore}`);
                
                // First run common fallback strategies
                runFallbackStrategies();
                
                // Execute AI instructions
                executeAIInstructions(instructions);
                
                // Check content after removal
                const contentAfter = document.querySelectorAll('article, main, .content, [class*="content"]').length;
                console.log(`Content elements after removal: ${contentAfter}`);
                
                if (contentAfter === 0 && contentBefore > 0) {
                    console.warn('⚠️ Warning: All content elements may have been removed!');
                }
                
                console.log('✅ AI paywall removal completed');
                return { success: true };
                
            } catch (error) {
                console.error('Instructions execution error:', error);
                return { 
                    success: false, 
                    error: 'Instructions execution failed: ' + error.message 
                };
            }
        };
        
        // Execute with multi-pass approach for better effectiveness
        setTimeout(() => {
            const result = executeInstructions();
            
            if (result.success) {
                console.log('✅ Paywall removal executed successfully');
                
                // Single follow-up check for dynamically loaded paywalls
                setTimeout(() => {
                    console.log('🔄 Running gentle follow-up check...');
                    
                    // Only run very targeted removal for obvious overlays
                    document.querySelectorAll('*').forEach(el => {
                        const style = window.getComputedStyle(el);
                                    const className = getElementClassName(el);
            const elementId = getElementId(el);
            const classAndId = (className + ' ' + elementId).toLowerCase();
            
            // Only remove very obvious paywall overlays
            if (parseInt(style.zIndex) > 9999 && 
                style.position === 'fixed' &&
                classAndId.includes('paywall')) {
                el.remove();
                console.log('Removed late-loading paywall overlay');
            }
                    });
                    
                    // Final check and logging
                    setTimeout(() => {
                        logCurrentPaywallElements();
                        checkPaywallRemoval();
                        console.log('Follow-up check completed');
                    }, 1000);
                }, 2000);
                
                sendResponse({ success: true });
                
            } else {
                console.error('❌ Paywall removal failed:', result.error);
                sendResponse({ 
                    success: false, 
                    error: result.error 
                });
            }
        }, 100);
        
    } catch (error) {
        console.error('Failed to execute paywall removal:', error);
        sendResponse({ 
            success: false, 
            error: 'Failed to execute paywall removal: ' + error.message 
        });
    }
}

// Execute AI instructions safely
function executeAIInstructions(instructions) {
    console.log('Executing AI instructions:', instructions);
    
    try {
        // Remove elements completely (with content protection)
        if (instructions.removeElements && Array.isArray(instructions.removeElements)) {
            console.log('Removing elements:', instructions.removeElements);
            instructions.removeElements.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        // Safety check: don't remove main content areas or large text blocks
                        if (['MAIN', 'ARTICLE', 'SECTION'].includes(el.tagName) || 
                            el.textContent.length > 1000) {
                            console.log(`Skipping removal of main content element: ${el.tagName}`);
                            return;
                        }
                        el.remove();
                    });
                    console.log(`Removed ${elements.length} elements matching: ${selector}`);
                } catch (e) {
                    console.warn(`Failed to remove elements with selector: ${selector}`, e);
                }
            });
        }
        
        // Hide elements
        if (instructions.hideElements && Array.isArray(instructions.hideElements)) {
            console.log('Hiding elements:', instructions.hideElements);
            instructions.hideElements.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.style.display = 'none';
                        el.style.visibility = 'hidden';
                    });
                    console.log(`Hidden ${elements.length} elements matching: ${selector}`);
                } catch (e) {
                    console.warn(`Failed to hide elements with selector: ${selector}`, e);
                }
            });
        }
        
        // Remove classes
        if (instructions.removeClasses && Array.isArray(instructions.removeClasses)) {
            console.log('Removing classes:', instructions.removeClasses);
            instructions.removeClasses.forEach(className => {
                try {
                    const elements = document.querySelectorAll(`.${className}`);
                    elements.forEach(el => el.classList.remove(className));
                    console.log(`Removed class ${className} from ${elements.length} elements`);
                } catch (e) {
                    console.warn(`Failed to remove class: ${className}`, e);
                }
            });
        }
        
        // Restore scroll
        if (instructions.restoreScroll) {
            console.log('Restoring scroll capabilities');
            unwallUtils.removeScrollRestrictions();
        }
        
        // Remove blur and opacity
        if (instructions.removeBlur) {
            console.log('Removing blur and opacity restrictions');
            unwallUtils.removeBlurAndOpacity();
        }
        
        // Expand content
        if (instructions.expandContent) {
            console.log('Expanding content');
            unwallUtils.expandContent();
        }
        
        // Remove high z-index elements
        if (instructions.removeHighZIndex) {
            console.log('Removing high z-index overlays');
            unwallUtils.removeElementsByZIndex(1000);
        }
        
        // Show hidden content
        if (instructions.showHiddenContent && Array.isArray(instructions.showHiddenContent)) {
            console.log('Showing hidden content:', instructions.showHiddenContent);
            instructions.showHiddenContent.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.style.display = 'block';
                        el.style.visibility = 'visible';
                        el.style.opacity = '1';
                    });
                    console.log(`Made visible ${elements.length} elements matching: ${selector}`);
                } catch (e) {
                    console.warn(`Failed to show elements with selector: ${selector}`, e);
                }
            });
        }
        
        // Apply custom styles
        if (instructions.customStyles && Array.isArray(instructions.customStyles)) {
            console.log('Applying custom styles:', instructions.customStyles);
            instructions.customStyles.forEach(styleRule => {
                try {
                    const elements = document.querySelectorAll(styleRule.selector);
                    elements.forEach(el => {
                        el.style[styleRule.property] = styleRule.value;
                    });
                    console.log(`Applied ${styleRule.property}: ${styleRule.value} to ${elements.length} elements matching: ${styleRule.selector}`);
                } catch (e) {
                    console.warn(`Failed to apply style rule:`, styleRule, e);
                }
            });
        }
        
        // Remove elements by text content
        if (instructions.removeTextElements && Array.isArray(instructions.removeTextElements)) {
            console.log('Removing elements by text content:', instructions.removeTextElements);
            instructions.removeTextElements.forEach(textPattern => {
                try {
                    removeElementsByText(textPattern);
                } catch (e) {
                    console.warn(`Failed to remove elements containing text: ${textPattern}`, e);
                }
            });
        }
        
        // Replace text content
        if (instructions.replaceTextContent && Array.isArray(instructions.replaceTextContent)) {
            console.log('Replacing text content:', instructions.replaceTextContent);
            instructions.replaceTextContent.forEach(replacement => {
                try {
                    replaceTextInElements(replacement.selector, replacement.find, replacement.replace);
                } catch (e) {
                    console.warn(`Failed to replace text:`, replacement, e);
                }
            });
        }
        
        console.log('All AI instructions executed successfully');
        
    } catch (error) {
        console.error('Error executing AI instructions:', error);
        throw error;
    }
}

// Log current paywall elements for debugging
function logCurrentPaywallElements() {
    console.log('=== CURRENT PAYWALL ELEMENTS ===');
    
    const selectors = [
        '[class*="paywall"]',
        '[class*="subscription"]', 
        '[class*="premium"]',
        '[class*="overlay"]',
        '[class*="modal"]',
        '[id*="paywall"]',
        '[data-paywall]',
        'body[style*="overflow: hidden"]',
        'html[style*="overflow: hidden"]'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`Found ${elements.length} elements matching "${selector}":`, elements);
        }
    });
    
    // Check for blurred content
    const blurred = document.querySelectorAll('*[style*="blur"], *[style*="opacity"]');
    if (blurred.length > 0) {
        console.log(`Found ${blurred.length} potentially blurred/faded elements:`, blurred);
    }
    
    // Check scroll restrictions
    const bodyStyle = window.getComputedStyle(document.body);
    const htmlStyle = window.getComputedStyle(document.documentElement);
    console.log('Body overflow:', bodyStyle.overflow);
    console.log('HTML overflow:', htmlStyle.overflow);
    console.log('Body position:', bodyStyle.position);
}

// Run common fallback strategies that work on most paywalls
function runFallbackStrategies() {
    console.log('🔧 Running fallback paywall removal strategies...');
    
    try {
        // Strategy 1: Remove common paywall overlays
        const overlaySelectors = [
            '[class*="paywall"]',
            '[class*="subscription"]',
            '[class*="premium"]',
            '[class*="overlay"]',
            '[class*="modal"]',
            '[class*="popup"]',
            '[id*="paywall"]',
            '[id*="subscription"]',
            '[data-paywall]',
            '.paywall',
            '#paywall',
            '.subscription-modal',
            '.premium-overlay'
        ];
        
        let removedCount = 0;
        overlaySelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // Skip main content areas
                if (['MAIN', 'ARTICLE', 'SECTION'].includes(el.tagName)) {
                    return;
                }
                
                // Skip elements with lots of content (likely main article)
                if (el.textContent.length > 1000) {
                    return;
                }
                
                const style = window.getComputedStyle(el);
                // Only remove if it looks like an overlay (high z-index or fixed position)
                if (style.position === 'fixed' || style.position === 'absolute' || 
                    parseInt(style.zIndex) > 100) {
                    el.remove();
                    removedCount++;
                }
            });
        });
        console.log(`Removed ${removedCount} potential overlay elements`);
        
        // Strategy 2: Restore scroll
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.body.style.position = 'static';
        console.log('Restored scroll capabilities');
        
        // Strategy 3: Remove blur and opacity restrictions (preserve main content)
        document.querySelectorAll('*').forEach(el => {
            // Skip main content elements
            if (['MAIN', 'ARTICLE', 'SECTION', 'P'].includes(el.tagName)) {
                return;
            }
            
            // Only affect small elements or those with paywall classes
            const className = getElementClassName(el);
            const hasPaywallClasses = className.toLowerCase().match(/paywall|premium|overlay/);
            if (el.textContent.length > 500 && !hasPaywallClasses) {
                return;
            }
            
            const style = window.getComputedStyle(el);
            if (style.filter && style.filter.includes('blur')) {
                el.style.filter = 'none';
            }
            if (style.opacity && parseFloat(style.opacity) < 0.5) { // Only very low opacity
                el.style.opacity = '1';
            }
        });
        console.log('Removed blur and opacity restrictions');
        
        // Strategy 4: Remove height restrictions on content
        document.querySelectorAll('[class*="content"], [class*="article"], [class*="story"]').forEach(el => {
            if (el.style.maxHeight) {
                el.style.maxHeight = 'none';
            }
            if (el.style.height) {
                el.style.height = 'auto';
            }
        });
                console.log('Removed height restrictions on content');
        
        // Strategy 5: Force visibility of likely content areas (preserve content)
        document.querySelectorAll('article, main, .content, .article, .story, .post, [class*="content"], [class*="article"]').forEach(el => {
            el.style.display = 'block';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.style.maxHeight = 'none';
            el.style.height = 'auto';
            el.style.overflow = 'visible';
        });
        console.log('Force-revealed content areas');
        
    } catch (error) {
        console.error('Error in fallback strategies:', error);
    }
}

// Handle quick removal (fallback strategies only)
function handleQuickRemoval(sendResponse) {
    try {
        console.log('=== QUICK PAYWALL REMOVAL ===');
        
        // Log current state before
        logCurrentPaywallElements();
        
        // Run fallback strategies
        runFallbackStrategies();
        
        // Check results after a short delay
        setTimeout(() => {
            console.log('=== AFTER QUICK REMOVAL ===');
            logCurrentPaywallElements();
            checkPaywallRemoval();
            
            sendResponse({ success: true });
        }, 500);
        
    } catch (error) {
        console.error('Failed to execute quick removal:', error);
        sendResponse({ 
            success: false, 
            error: 'Quick removal failed: ' + error.message 
        });
    }
}

// Check if paywall removal was successful
function checkPaywallRemoval() {
    try {
        // Common paywall indicators to check for removal
        const paywallSelectors = [
            '[class*="paywall"]',
            '[id*="paywall"]',
            '[class*="subscription"]',
            '[class*="premium"]',
            '[class*="overlay"]',
            '[class*="modal"]',
            '[class*="popup"]',
            '[data-paywall]',
            '.paywall',
            '#paywall'
        ];
        
        let remainingPaywalls = 0;
        paywallSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Check if element is visible and likely a paywall
                const style = window.getComputedStyle(element);
                if (style.display !== 'none' && 
                    style.visibility !== 'hidden' && 
                    style.opacity !== '0') {
                    remainingPaywalls++;
                }
            });
        });
        
        console.log(`Paywall check: ${remainingPaywalls} potential paywall elements remaining`);
        
        // Check for common paywall text patterns
        const paywallTexts = [
            'subscribe',
            'subscription',
            'premium',
            'unlock',
            'continue reading',
            'sign up',
            'create account'
        ];
        
        const bodyText = document.body.textContent.toLowerCase();
        const foundTexts = paywallTexts.filter(text => bodyText.includes(text));
        
        if (foundTexts.length > 0) {
            console.log('Possible paywall text patterns still found:', foundTexts);
        }
        
    } catch (error) {
        console.error('Error checking paywall removal:', error);
    }
}

// Utility function to safely remove elements
function removePaywallElements(selectors) {
    if (!Array.isArray(selectors)) {
        selectors = [selectors];
    }
    
    let removedCount = 0;
    
    selectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.remove();
                removedCount++;
            });
        } catch (error) {
            console.error(`Error removing elements with selector "${selector}":`, error);
        }
    });
    
    console.log(`Removed ${removedCount} paywall elements`);
    return removedCount;
}

// Utility function to hide elements
function hidePaywallElements(selectors) {
    if (!Array.isArray(selectors)) {
        selectors = [selectors];
    }
    
    let hiddenCount = 0;
    
    selectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
                element.style.visibility = 'hidden';
                element.style.opacity = '0';
                hiddenCount++;
            });
        } catch (error) {
            console.error(`Error hiding elements with selector "${selector}":`, error);
        }
    });
    
    console.log(`Hidden ${hiddenCount} paywall elements`);
    return hiddenCount;
}

// Utility function to remove CSS restrictions
function removeScrollRestrictions() {
    try {
        // Remove overflow hidden from body and html
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        
        // Remove position fixed that might lock scrolling
        const fixedElements = document.querySelectorAll('*');
        fixedElements.forEach(element => {
            const style = window.getComputedStyle(element);
            if (style.position === 'fixed' && 
                (style.top === '0px' || style.bottom === '0px') &&
                (style.left === '0px' || style.right === '0px')) {
                // This might be a paywall overlay
                element.style.position = 'static';
            }
        });
        
        console.log('Removed scroll restrictions');
    } catch (error) {
        console.error('Error removing scroll restrictions:', error);
    }
}

// Additional utility functions for AI scripts
function removeElementsByZIndex(minZIndex = 1000) {
    document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (parseInt(style.zIndex) >= minZIndex && 
            (style.position === 'fixed' || style.position === 'absolute')) {
            el.remove();
        }
    });
}

function removeBlurAndOpacity() {
    document.querySelectorAll('*').forEach(el => {
        // Skip main content elements
        if (['MAIN', 'ARTICLE', 'SECTION', 'P'].includes(el.tagName)) {
            return;
        }
        
        // Only affect elements with obvious paywall indicators or small elements
        const className = getElementClassName(el);
        const hasPaywallClasses = className.toLowerCase().match(/paywall|premium|overlay|blur/);
        if (el.textContent.length > 300 && !hasPaywallClasses) {
            return;
        }
        
        const style = window.getComputedStyle(el);
        if (style.filter && style.filter.includes('blur')) {
            el.style.filter = 'none';
        }
        if (style.opacity && parseFloat(style.opacity) < 0.5) { // Only very low opacity
            el.style.opacity = '1';
        }
        // Remove text selection restrictions
        el.style.userSelect = 'auto';
        el.style.webkitUserSelect = 'auto';
    });
}

function expandContent() {
    document.querySelectorAll('*').forEach(el => {
        if (el.style.maxHeight && el.style.maxHeight !== 'none') {
            el.style.maxHeight = 'none';
        }
        if (el.style.height && el.style.height.includes('px') && parseInt(el.style.height) < 200) {
            el.style.height = 'auto';
        }
        if (el.style.overflow === 'hidden') {
            el.style.overflow = 'visible';
        }
    });
}

// Remove elements containing specific text patterns (more conservative)
function removeElementsByText(textPattern) {
    const textLower = textPattern.toLowerCase();
    let removedCount = 0;
    
    // Check all text-containing elements
    document.querySelectorAll('*').forEach(el => {
        // Skip script, style, and other non-visible elements
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'TITLE', 'HEAD', 'HTML', 'BODY'].includes(el.tagName)) {
            return;
        }
        
        // Skip main content areas to avoid removing articles
        if (['MAIN', 'ARTICLE', 'SECTION'].includes(el.tagName)) {
            return;
        }
        
        // Skip if element has content-indicating classes
        const className = getElementClassName(el).toLowerCase();
        if (className.match(/content|article|story|post|main|body|text|paragraph/)) {
            return;
        }
        
        const textContent = el.textContent.toLowerCase().trim();
        
        // Only proceed if element contains the text pattern and is small
        if (textContent.includes(textLower) && textContent.length < 200) {
            // Additional checks to avoid removing main content
            const style = window.getComputedStyle(el);
            const isOverlay = style.position === 'fixed' || style.position === 'absolute' || 
                             parseInt(style.zIndex) > 100;
            const isSmallElement = el.offsetHeight < 200 && el.offsetWidth < 800;
            const className = getElementClassName(el);
            const hasPaywallClasses = className.toLowerCase().match(/paywall|subscription|premium|modal|overlay|popup|banner|cta|button/);
            
            // Only remove if it's clearly a paywall element
            if ((isOverlay || hasPaywallClasses) && isSmallElement) {
                el.remove();
                removedCount++;
            }
        }
    });
    
    console.log(`Removed ${removedCount} elements containing text: "${textPattern}"`);
    return removedCount;
}

// Replace text content in specific elements
function replaceTextInElements(selector, findText, replaceText) {
    let replacedCount = 0;
    
    try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el.textContent.includes(findText)) {
                el.textContent = el.textContent.replace(new RegExp(findText, 'gi'), replaceText);
                replacedCount++;
            }
        });
        
        console.log(`Replaced text in ${replacedCount} elements: "${findText}" → "${replaceText}"`);
    } catch (error) {
        console.warn(`Failed to replace text with selector ${selector}:`, error);
    }
    
    return replacedCount;
}

// Conservative targeted removal for paywall elements
function aggressivePaywallRemoval() {
    console.log('🎯 Running targeted paywall removal...');
    
    // Only target obvious paywall text patterns in small elements
    const paywallTexts = ['subscribe to continue', 'get unlimited access', 'this article is for subscribers'];
    
    paywallTexts.forEach(text => {
        removeElementsByText(text);
    });
    
    // Remove elements with suspicious styling - but be very conservative
    document.querySelectorAll('*').forEach(el => {
        // Skip main content elements
        if (['MAIN', 'ARTICLE', 'SECTION', 'P', 'DIV'].includes(el.tagName) && 
            el.textContent.length > 200) {
            return;
        }
        
        const style = window.getComputedStyle(el);
        
        // Only remove very high z-index overlays that are clearly blocking content
        if (parseInt(style.zIndex) > 9999 && 
            (style.position === 'fixed' || style.position === 'absolute') &&
            el.offsetHeight > 100 && el.offsetWidth > 100) {
            
            // Double check it's not main content
            const textContent = el.textContent.trim();
            if (textContent.length < 500 || textContent.toLowerCase().includes('subscribe')) {
                el.remove();
                console.log('Removed high z-index overlay:', el);
            }
        }
        
        // Only remove elements with very obvious paywall classes/IDs
        const className = getElementClassName(el);
        const elementId = getElementId(el);
        const classAndId = (className + ' ' + elementId).toLowerCase();
        if (classAndId.match(/paywall-overlay|subscription-modal|premium-banner/) && 
            el.textContent.length < 300) {
            el.remove();
            console.log('Removed paywall element:', el);
        }
    });
    
    console.log('Targeted removal completed');
}

// Make utility functions available globally for AI-generated scripts
window.unwallUtils = {
    removePaywallElements,
    hidePaywallElements,
    removeScrollRestrictions,
    removeElementsByZIndex,
    removeBlurAndOpacity,
    expandContent,
    removeElementsByText,
    replaceTextInElements,
    aggressivePaywallRemoval
};

// Initialize
console.log('Unwall content script initialized for:', window.location.href);
console.log('🛡️ Content protection mode: ON - Main articles and large text blocks will be preserved'); 