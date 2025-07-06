# Last War Screenshot Extractor

A TypeScript-based tool for extracting ranking data from Last War mobile game screenshots using AI vision models. This tool processes screenshots organized by week and day, extracts commander rankings and points, and exports the data to JSON, CSV, or Excel formats.

## Features

- **AI-Powered Text Extraction**: Uses OpenAI, Anthropic, or Google Vision APIs to extract text from screenshots
- **Structured Data Organization**: Organizes data by week and day for tournament tracking
- **Multiple Export Formats**: Supports JSON, CSV, and Excel (with separate sheets per week/day)
- **Configurable Processing**: Batch processing with rate limiting and retry logic
- **Cost Estimation**: Estimates processing costs before running
- **Validation**: Validates directory structure and extracted data
- **Progress Tracking**: Real-time progress indicators and statistics

## Directory Structure

Your screenshots should be organized as follows:

```
screenshots/
├── week1/
│   ├── Monday/
│   │   ├── screenshot1.png
│   │   └── screenshot2.png
│   ├── Tuesday/
│   │   └── screenshot3.png
│   ├── Wednesday/
│   ├── Thursday/
│   ├── Friday/
│   ├── Saturday/
│   └── Weekly/
│       └── final_rankings.png
├── week2/
│   ├── Monday/
│   ├── Tuesday/
│   └── ...
└── ...
```

## Prerequisites

- Node.js 22.0.0 or higher
- An API key from one of the supported AI providers:
  - OpenAI (recommended for accuracy)
  - Anthropic Claude
  - Google Vision API

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize configuration:
   ```bash
   npm run dev -- init
   ```

4. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

5. Add your API key to the `.env` file:
   ```bash
   AI_API_KEY=your-actual-api-key-here
   ```

## Configuration

### Environment Variables

The easiest way to configure the tool is through environment variables in your `.env` file:

```env
# AI Provider (openai, anthropic, google)
AI_PROVIDER=openai
AI_API_KEY=your-api-key-here
AI_MODEL=gpt-4o

# Directories
INPUT_DIRECTORY=./screenshots
OUTPUT_DIRECTORY=./output

# Export format (json, csv, xlsx)
EXPORT_FORMAT=xlsx

# Processing settings
BATCH_SIZE=5
RETRY_ATTEMPTS=3
DELAY_BETWEEN_REQUESTS=1000
```

### Configuration File

Alternatively, you can use a `config.json` file:

```json
{
  "aiProvider": {
    "name": "openai",
    "endpoint": "https://api.openai.com",
    "model": "gpt-4o",
    "apiKey": "your-api-key-here"
  },
  "inputDirectory": "./screenshots",
  "outputDirectory": "./output",
  "exportFormat": "xlsx",
  "batchSize": 5,
  "retryAttempts": 3,
  "delayBetweenRequests": 1000
}
```

## Usage

### Basic Usage

Process all screenshots in the default directory:

```bash
npm run dev -- extract
```

### Advanced Usage

```bash
# Process specific directory
npm run dev -- extract --input ./my-screenshots --output ./results

# Use different AI provider
npm run dev -- extract --provider anthropic

# Export to CSV instead of Excel
npm run dev -- extract --format csv

# Dry run (see what would be processed)
npm run dev -- extract --dry-run

# Use custom configuration file
npm run dev -- extract --config ./my-config.json
```

### Other Commands

```bash
# Validate directory structure
npm run dev -- validate --input ./screenshots

# List available AI providers
npm run dev -- providers

# Estimate processing costs
npm run dev -- cost --input ./screenshots --provider openai

# Initialize configuration files
npm run dev -- init --output ./config
```

## AI Provider Setup

### OpenAI (Recommended)

1. Sign up at [OpenAI Platform](https://platform.openai.com)
2. Create an API key at [API Keys](https://platform.openai.com/api-keys)
3. Set environment variable: `AI_PROVIDER=openai`
4. Cost: ~$0.01 per image
5. Rate limits: 500 requests/day for free tier

### Anthropic Claude

1. Sign up at [Anthropic Console](https://console.anthropic.com)
2. Create an API key
3. Set environment variable: `AI_PROVIDER=anthropic`
4. Cost: ~$0.003 per image
5. Rate limits: Varies by tier

## Output Formats

### Excel (XLSX) - Recommended

- Separate sheets for each day of the week
- Summary sheet with metadata
- Separate sheets for weekly final rankings
- Easy to analyze and share

### CSV

- Single file with all data
- Option to create separate files per week
- Good for data analysis tools

### JSON

- Machine-readable format
- Preserves full data structure
- Good for further processing

## Sample Output

The extracted data will include:

```json
{
  "weeks": [
    {
      "weekNumber": 1,
      "weekDate": "2024-01-01",
      "dailyData": [
        {
          "day": "Monday",
          "entries": [
            {
              "rank": 1,
              "commanderName": "TopPlayer1",
              "points": 50000
            }
          ]
        }
      ],
      "weeklyData": [
        {
          "rank": 1,
          "commanderName": "TopPlayer1",
          "points": 100000
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **"No screenshots found"**
   - Check directory structure matches expected format
   - Ensure image files are in supported formats (jpg, png, gif, bmp, webp)
   - Run validation: `npm run dev -- validate`

2. **"API key required"**
   - Ensure your `.env` file contains the correct API key
   - Check that the API key is valid and has sufficient credits

3. **"Rate limit exceeded"**
   - Reduce batch size: `BATCH_SIZE=3`
   - Increase delay: `DELAY_BETWEEN_REQUESTS=2000`

4. **"Invalid directory structure"**
   - Week directories must be named like "week1", "week2", etc.
   - Day directories must be named exactly: "Monday", "Tuesday", etc., or "Weekly"

### Debug Mode

Run with debug information:

```bash
npm run dev -- extract --dry-run
```

This will show what would be processed without making API calls.

## Cost Management

- **Estimate costs first**: Use `npm run dev -- cost` before processing
- **Use batch processing**: Default batch size of 5 helps manage rate limits
- **Monitor usage**: The tool reports API request counts after processing
- **Consider provider costs**: OpenAI is most accurate but more expensive than alternatives

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── index.ts              # Main CLI application
├── types/                # TypeScript type definitions
├── services/             # AI service implementations
├── processors/           # Data processing logic
├── utils/               # Utility functions
│   ├── fileSystem.ts    # File system operations
│   ├── config.ts        # Configuration management
│   └── exportUtils.ts   # Export functionality
└── ...
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Run validation commands to identify issues
3. Use dry-run mode to test without API costs
4. Review the console output for detailed error messages

## Roadmap

- [ ] Support for additional AI providers
- [ ] Advanced data filtering and analysis
- [ ] Web interface for easier use
- [ ] Automatic screenshot capturing
- [ ] Historical data comparison
- [ ] Tournament bracket generation
