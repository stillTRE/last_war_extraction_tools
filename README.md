# Last War Screenshot Extractor

A simple tool to extract ranking data from Last War mobile game screenshots using AI vision models.

## Overview

This tool processes screenshots from the Last War mobile game, extracts ranking information using AI, and outputs the data in your preferred format (JSON, CSV, or Excel). It focuses on processing one week of data at a time.

## Features

- **AI-Powered Text Extraction**: Uses OpenAI or Anthropic APIs to extract text from screenshots
- **Simple Command Line Interface**: Single command with clear options
- **Multiple Export Formats**: JSON, CSV, or Excel with day-based organization
- **Structured Data Organization**: Organizes data by day for tournament tracking
- **Minimal Configuration**: Sensible defaults with environment variable support

## Directory Structure

Organize your screenshots in this structure:

```
screenshots/
└── week1/
    ├── Monday/
    │   ├── screenshot1.jpg
    │   └── screenshot2.jpg
    ├── Tuesday/
    │   └── screenshot1.jpg
    └── Weekly/
        └── final_rankings.jpg
```

The tool processes one week of data at a time. You can either:
1. Point directly to a week directory (e.g., `screenshots/week1`)
2. Point to a parent directory, and the most recent week will be used

## Prerequisites

- Node.js (v18 or later)
- OpenAI or Anthropic API key
- Screenshots organized in the structure shown above

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage

Run the tool with a single command:

```bash
npm run extract -- /path/to/screenshots/week1 --apiKey YOUR_API_KEY
```

Or with more options:

```bash
npm run extract -- /path/to/screenshots --output ./results --format xlsx --apiKey YOUR_API_KEY
```

### Command Line Options

- **Input Directory** (required): Path to the screenshots directory
- **--output, -o**: Output directory for results (default: `./output`)
- **--format, -f**: Output format: `json`, `csv`, or `xlsx` (default: `json`)
- **--apiKey, -k**: API key for the AI service (can also be set as `AI_API_KEY` environment variable)
- **--provider, -p**: AI provider to use: `openai` or `anthropic` (default: `openai`)
- **--model, -m**: AI model to use (provider-specific)
- **--dry-run**: Show what would be processed without making API calls

### Examples

```bash
# Process a specific week directory and export as JSON with OpenAI
npm run extract -- ./screenshots/week1 --apiKey sk-your-api-key

# Process the most recent week and export as Excel
npm run extract -- ./screenshots --format xlsx --output ./results

# Use Anthropic's Claude instead of OpenAI
npm run extract -- ./screenshots --provider anthropic --apiKey sk-ant-api-key

# Specify a particular model
npm run extract -- ./screenshots --provider openai --model gpt-4o-vision --apiKey sk-your-api-key
```

## Quick Start

For a guided setup, run the included quick-start script:

```bash
./scripts/quick-start.sh
```

This script will:
1. Check your Node.js installation
2. Install dependencies
3. Guide you through AI provider setup
4. Create a sample directory structure

## Output Formats

### JSON

JSON output preserves the full data structure and is good for further processing:

```json
{
  "week": {
    "weekNumber": 1,
    "weekDate": "2024-01-01",
    "dailyData": [
      {
        "day": "Monday",
        "entries": [
          { "rank": 1, "commanderName": "Player1", "points": 50000 },
          { "rank": 2, "commanderName": "Player2", "points": 45000 }
        ]
      }
    ],
    "weeklyData": [
      { "rank": 1, "commanderName": "Player1", "points": 350000 }
    ]
  }
}
```

### CSV

CSV output creates separate files for each day, making it easy to import into spreadsheets or analysis tools.

### Excel (XLSX)

Excel output creates a workbook with:
- Separate sheets for each day
- A sheet for weekly rankings
- A summary sheet with metadata

## AI Provider Setup

### OpenAI (Recommended)

1. Sign up at [OpenAI Platform](https://platform.openai.com)
2. Create an API key at [API Keys](https://platform.openai.com/api-keys)
3. Cost: ~$0.01 per image
4. Default model: gpt-4-vision-preview

### Anthropic Claude

1. Sign up at [Anthropic Console](https://console.anthropic.com)
2. Create an API key
3. Cost: ~$0.015 per image
4. Default model: claude-3-opus-20240229

## Troubleshooting

### Common Issues

1. **"No screenshots found"**
   - Check that your directory structure matches the expected format
   - Ensure image files are in supported formats (jpg, png, gif, bmp, webp)

2. **"API key required"**
   - Ensure you've provided a valid API key either as a command-line option or environment variable

3. **"No week directory found"**
   - Ensure your input path contains a directory named like "week1", "week2", etc.
   - Day directories must be named exactly: "Monday", "Tuesday", etc., or "Weekly"

### Debug Mode

Run with the `--dry-run` flag to see what would be processed without making API calls:

```bash
npm run extract -- ./screenshots/week1 --dry-run
```

## Project Structure

The project has been simplified to focus on the core functionality:

- **src/index.ts**: Main CLI application
- **src/schema.ts**: Zod schema definitions
- **src/services/aiService.ts**: AI provider integration
- **src/processors/dataProcessor.ts**: Data processing logic
- **src/utils/**: Utility functions for filesystem, export, and configuration

## Cost Management

- Use the `--dry-run` flag to see how many screenshots will be processed
- The tool provides cost estimates before processing
- Consider using Anthropic for lower costs if accuracy is less critical

## License

MIT License