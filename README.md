# 🚫🧱 Unwall - AI-Powered Paywall Remover

**Unwall** is a Chrome extension that uses AI to intelligently remove paywall elements from websites, allowing you to access content that's blocked by subscription prompts and overlays.

## ⚠️ Important Disclaimer

This extension is for educational and research purposes only. Please respect content creators and publishers by subscribing to services you use regularly. This tool should not be used to circumvent legitimate paywalls in a way that violates terms of service or copyright laws.

## 🌟 Features

- **AI-Powered Analysis**: Uses advanced AI models (Claude 3.5 Sonnet, GPT-4, etc.) to analyze page content
- **Smart Paywall Detection**: Identifies and removes various types of paywall elements
- **Safe Execution**: Validates and sanitizes AI-generated code before execution
- **Multiple AI Models**: Support for various OpenRouter AI models
- **Easy Configuration**: Simple setup through the extension popup
- **Real-time Status**: Shows progress and results of paywall removal attempts

## 🚀 Installation

### Prerequisites

1. **OpenRouter API Key**: Get your API key from [OpenRouter](https://openrouter.ai/keys)
2. **Google Chrome**: This extension is built for Chrome (Manifest V3)

### Installation Steps

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/dankritz/unwall.git
   cd unwall
   ```

2. **Load the Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top-right corner)
   - Click "Load unpacked" and select the `unwall` folder
   - The Unwall extension should now appear in your extensions list

3. **Configure Extension**:
   - Click on the Unwall extension icon in the Chrome toolbar
   - Click "⚙️ API Configuration"
   - Enter your OpenRouter API key
   - Choose your preferred AI model:
     - **Google Gemini 2.5 Flash**: Fast responses, good accuracy
     - **Anthropic Claude Sonnet 4**: Advanced analysis, higher accuracy and much higher cost!
   - Click "Save Configuration"

## 🎯 Usage

1. **Navigate** to a website with a paywall
2. **Click** the Unwall extension icon in your Chrome toolbar
3. **Click** "Remove Paywall" button
4. **Wait** for the AI to analyze the page and generate removal code
5. **Enjoy** accessing the content (if successful)

### Status Messages

- 🟡 **Analyzing page...**: Extension is extracting page content
- 🟡 **Sending to AI for analysis...**: Content is being processed by AI
- 🟡 **Executing paywall removal...**: AI-generated code is being executed
- ✅ **Paywall removed successfully!**: Content should now be accessible
- ❌ **Error messages**: Check console for details or try refreshing the page

## 🔧 Configuration

### AI Models

Choose between two powerful AI models for paywall analysis:

- **Google Gemini 2.5 Flash**: Fast responses with good accuracy, ideal for quick paywall removal
- **Anthropic Claude Sonnet 4**: Advanced analysis with higher accuracy, better for complex paywalls

### Enhanced Effectiveness Features

- **Conservative Removal**: Protects main content while targeting paywall elements
- **Text-based Detection**: Identifies and removes elements containing paywall text patterns
- **Smart Strategies**: Uses multiple removal techniques including blur removal, scroll restoration, and content expansion
- **Content Protection**: Automatically preserves article content, main sections, and large text blocks
- **Targeted Detection**: Focuses on high z-index overlays, modal dialogs, and subscription prompts

### Configuration File (Optional)

You can also set up configuration using the `config.json.example` file:

1. Copy `config.json.example` to `config.json`
2. Add your OpenRouter API key
3. Optionally change the default AI model

## 🏗️ Technical Details

### Architecture

- **Popup Interface**: User interaction and configuration
- **Content Script**: Extracts page HTML and executes AI-generated code
- **Background Script**: Handles OpenRouter API communication
- **AI Processing**: Analyzes HTML and generates JavaScript for paywall removal

### Security Features

- **Code Validation**: AI-generated JavaScript is validated before execution
- **Dangerous Pattern Detection**: Prevents execution of potentially harmful code
- **Safe Execution Context**: Code runs in a controlled environment
- **API Key Storage**: Securely stored using Chrome's sync storage

### File Structure

```
unwall/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── content.js            # Content script for page interaction
├── background.js         # Background script for API calls
├── config.json.example   # Example configuration file
├── icons/                # Extension icons
│   ├── icon16.svg
│   ├── icon32.svg
│   ├── icon48.svg
│   └── icon128.svg
└── README.md            # This file
```

## 🐛 Troubleshooting

### Common Issues

1. **"API key required" error**:
   - Make sure you've entered a valid OpenRouter API key
   - Check that the key has sufficient credits

2. **"Failed to extract page content" error**:
   - Try refreshing the page and running the extension again
   - Some pages may block content script access

3. **"AI processing failed" error**:
   - Check your internet connection
   - Verify your OpenRouter API key is valid and has credits
   - Try a different AI model

4. **Paywall still visible after "success" message**:
   - Some paywalls may require page refresh after removal
   - Complex paywalls might not be fully removable
   - Try running the extension again

### Debug Information

Enable Chrome Developer Tools console to see detailed logging:
1. Press `F12` to open Developer Tools
2. Go to the "Console" tab
3. Run the extension and check for error messages

## 📝 Development

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Building

No build process is required - this is a standard Chrome extension that can be loaded directly.

### Testing

Test the extension on various websites with different types of paywalls:
- Subscription overlays
- Content blurring/hiding
- Scroll restrictions
- Modal dialogs

## 📄 License

This project is provided for educational purposes. Please use responsibly and respect content creators' rights.

## 🙏 Acknowledgments

- OpenRouter for providing AI model access
- Google Gemini 2.5 Flash for fast paywall analysis
- Anthropic Claude Sonnet 4 for advanced paywall analysis
- The Chrome Extensions team for the robust extension platform

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Chrome extension console logs
3. Ensure your OpenRouter API key is valid
4. Try different AI models if one isn't working

---

**Remember**: This tool is for educational purposes.
