# Elder News Scrolls

A lightweight Chrome extension that displays a scrolling news ticker at the bottom of your browser window, showing the latest headlines from NewsAPI.

## Features

- Real-time news headlines in a scrolling ticker
- Auto-updates every 15 minutes
- Smooth scrolling animation
- Pause on hover
- Error handling with visual feedback
- Minimal resource usage

## Installation

### For Development

1. Clone this repository:
```bash
git clone https://github.com/yourusername/elder_news_scrolls.git
cd elder_news_scrolls
```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the project directory

### For Users (When Published)

1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. Follow the installation prompts

## Configuration

The news ticker is configured with the following default settings:

- Position: Fixed at the bottom of the browser window
- Height: 30px
- Background: Dark gray (#333)
- Text: White
- Scroll Speed: 80 seconds per cycle
- Update Frequency: Every 15 minutes

## Development

### File Structure

```
elder_news_scrolls/
├── manifest.json      # Extension configuration
├── background.js     # Background service worker
├── content.js        # Content script for ticker
├── styles.css        # Ticker styling
└── icon.png         # Extension icon
```

### API Usage

This extension uses the NewsAPI service with the following endpoint:
```
https://newsapi.org/v2/top-headlines?country=us
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [NewsAPI](https://newsapi.org/) for providing the news data
- Inspired by classic scrolling tickers and The Elder Scrolls aesthetic 