#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import fs from 'fs-extra';
import { FileSystemUtils } from './utils/fileSystem.js';
import { ConfigUtils } from './utils/config.js';
import { AIService } from './services/aiService.js';
import { DataProcessor } from './processors/dataProcessor.js';
import { ExportUtils } from './utils/exportUtils.js';
import { Config, ProcessingResult, ScreenshotFile, ExportOptions } from './schema.js';

const program = new Command();

program
  .name('last-war')
  .description('Extract ranking data from Last War mobile game screenshots using AI')
  .version('1.0.0');

// Single command with essential options
program
  .argument('<input>', 'Input directory containing screenshots')
  .option('-o, --output <path>', 'Output directory for results', './output')
  .option('-f, --format <format>', 'Output format (json, csv, xlsx)', 'json')
  .option('-k, --apiKey <key>', 'API key for the AI service (or set AI_API_KEY env var)')
  .option('-p, --provider <provider>', 'AI provider to use: openai or anthropic', 'openai')
  .option('-m, --model <model>', 'AI model to use (provider-specific)')
  .option('-w, --weekly-only', 'Process only the Weekly rankings (skip daily data)')
  .option('--dry-run', 'Show what would be processed without making API calls')
  .action(async (inputDir, options) => {
    // Create a spinner for visual feedback
    const spinner = ora('Starting screenshot processing...').start();

    try {
      // Load configuration with defaults
      const config = ConfigUtils.loadConfig();

      // Override config with command line options
      config.inputDirectory = inputDir;
      if (options.output) config.outputDirectory = options.output;
      if (options.format) config.exportFormat = options.format as 'json' | 'csv' | 'xlsx';
      if (options.provider) {
        // Only allow openai or anthropic
        if (['openai', 'anthropic'].includes(options.provider)) {
          config.aiProvider.name = options.provider as 'openai' | 'anthropic';
        } else {
          console.warn(chalk.yellow(`Provider "${options.provider}" not supported. Using openai.`));
        }
      }

      // Set the model if provided
      if (options.model) {
        config.aiProvider.model = options.model;
      } else {
        // Set default models based on provider
        if (config.aiProvider.name === 'openai') {
          config.aiProvider.model = 'gpt-4o';
        } else if (config.aiProvider.name === 'anthropic') {
          config.aiProvider.model = 'claude-3-opus-20240229';
        }
      }

      // API Key priority: CLI option > environment variable > config
      if (options.apiKey) {
        config.aiProvider.apiKey = options.apiKey;
      }

      // Ensure output directory exists
      await fs.ensureDir(config.outputDirectory);

      // Validate input directory
      spinner.text = 'Validating directory structure...';
      const validation = await FileSystemUtils.validateDirectoryStructure(config.inputDirectory);

      if (!validation.valid) {
        spinner.fail('Directory validation failed');
        console.error(chalk.red('Directory structure issues:'));
        validation.issues.forEach(issue => console.error(chalk.red(`  - ${issue}`)));
        process.exit(1);
      }

      // Scan for screenshots
      spinner.text = 'Scanning for screenshots...';
      const screenshots = await FileSystemUtils.scanScreenshotDirectory(config.inputDirectory);

      if (screenshots.length === 0) {
        spinner.fail('No screenshots found');
        console.error(chalk.red('No screenshot files found in the input directory'));
        process.exit(1);
      }

      spinner.succeed(`Found ${screenshots.length} screenshots`);

      // Display basic summary
      console.log(chalk.blue('\n Processing Summary:'));
      console.log(`  Screenshots: ${screenshots.length}`);
      // At this point, we're only working with a single week
      const weekName = screenshots[0]?.week || 'unknown';
      console.log(`Week: ${weekName}`);
      console.log(
        `
        Days: ${Array.from(new Set(screenshots.map(s => s.day)))
          .sort()
          .join(', ')}`
      );
      console.log(`AI Provider: ${config.aiProvider.name}`);
      console.log(`AI Model: ${config.aiProvider.model}`);
      console.log(`Output Format: ${config.exportFormat}`);

      // Simple cost estimate based on selected provider and model
      const costEstimate = ConfigUtils.estimateCost(
        screenshots.length,
        config.aiProvider.name,
        config.aiProvider.model
      );
      console.log(`  ${costEstimate}`);

      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 Dry run mode - showing what would be processed:'));
        screenshots.forEach((screenshot, index) => {
          console.log(
            `  ${index + 1}. ${screenshot.week}/${screenshot.day}/${screenshot.fileName}`
          );
        });
        return;
      }

      // Confirm processing for large batches
      if (screenshots.length > 10) {
        console.log(
          chalk.yellow(
            '\n  Large number of screenshots detected. Processing may take a while and incur costs.'
          )
        );
      }

      // Initialize AI service
      spinner.text = 'Initializing AI service...';

      // Check for API key
      if (!config.aiProvider.apiKey) {
        spinner.fail('No API key provided');
        console.error(
          chalk.red(
            'API key is required. Use --apiKey option or set AI_API_KEY environment variable.'
          )
        );
        process.exit(1);
      }

      const aiService = new AIService(config.aiProvider);
      spinner.succeed('AI service initialized');

      // Process screenshots
      spinner.text = 'Processing screenshots...';
      const results = await processScreenshots(screenshots, aiService, config);

      // Process results
      spinner.text = 'Processing extracted data...';
      const extractedData = DataProcessor.processResults(results);

      // Get the processed week data
      const processedWeek = extractedData.weeks[0];
      if (!processedWeek) {
        spinner.fail('No week data found');
        throw new Error('No week data found in processed results');
      }

      // Simple validation of the week data
      const dataValidation = DataProcessor.validateWeekData(processedWeek);
      if (!dataValidation.valid) {
        spinner.warn('Data validation issues found');
        console.warn(chalk.yellow('Data validation warnings:'));
        dataValidation.issues.forEach(issue => console.warn(chalk.yellow(`  - ${issue}`)));
      }

      spinner.succeed('Data processing completed');

      // Export results
      spinner.text = 'Exporting results...';

      // Ensure the results directory exists
      await fs.ensureDir('results');

      // Create a backup JSON export of the raw data first
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFileName = `${weekName}_${timestamp}`;
      const backupFileName = `${baseFileName}_backup.json`;
      const backupPath = path.join('results', backupFileName);

      try {
        // Save backup data first
        await fs.writeJSON(backupPath, extractedData, { spaces: 2 });
        console.log(chalk.green(`✓ Backup data saved to: ${backupPath}`));
      } catch (backupError) {
        console.warn(
          chalk.yellow(
            `Warning: Failed to save backup data: ${backupError instanceof Error ? backupError.message : 'Unknown error'}`
          )
        );
      }

      // Create a more readable filename with week information
      const outputFileName = `${baseFileName}.${config.exportFormat}`;
      const outputPath = path.join('results', outputFileName);

      const exportOptions: ExportOptions = {
        format: config.exportFormat,
        outputPath,
        includeMetadata: true,
      };

      let exportResultPath = '';
      try {
        const exportResult = await ExportUtils.exportData(extractedData, exportOptions);
        exportResultPath = outputPath;
        spinner.succeed(`Export completed: ${exportResult}`);
      } catch (exportError) {
        spinner.fail(
          `Export failed: ${exportError instanceof Error ? exportError.message : 'Unknown error'}`
        );
        console.log(
          chalk.green(`But don't worry! Your data is safely backed up in: ${backupPath}`)
        );
      }

      // Display final summary
      const summary = DataProcessor.getDataSummary(processedWeek);
      console.log(chalk.green('\n Processing Complete!'));
      console.log(`  Week ${processedWeek.weekNumber} data exported`);
      console.log(`  Days tracked: ${summary.dayCount}`);
      console.log(
        `  Total entries: ${summary.entryCount + (summary.hasWeeklyData ? processedWeek.weeklyData.length : 0)}`
      );
      console.log(`  Output path: ${exportResultPath || backupPath}`);

      const usage = aiService.getUsageStats();
      console.log(`  AI requests made: ${usage.requestCount}`);
    } catch (error) {
      spinner.fail('Processing failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

/**
 * Process screenshots with simple progress tracking
 */
async function processScreenshots(
  screenshots: ScreenshotFile[],
  aiService: AIService,
  config: Config
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];
  const totalScreenshots = screenshots.length;

  console.log(chalk.blue('\n Processing screenshots:'));

  for (let i = 0; i < totalScreenshots; i++) {
    const screenshot = screenshots[i];

    // Skip if screenshot is undefined (shouldn't happen)
    if (!screenshot) {
      console.error(chalk.red(`Screenshot at index ${i} is undefined, skipping`));
      continue;
    }

    const spinner = ora(
      `Processing screenshot ${i + 1}/${totalScreenshots}: ${screenshot.day}/${screenshot.fileName}`
    ).start();

    try {
      const startTime = Date.now();
      const imageBase64 = await FileSystemUtils.readImageAsBase64(screenshot.filePath);
      const extracted = await aiService.extractRankingData(imageBase64);

      results.push({
        file: screenshot,
        extracted,
        success: true,
        processingTime: Date.now() - startTime,
      });

      spinner.succeed(
        `Processed ${screenshot.day}/${screenshot.fileName}: ${extracted.length} entries extracted`
      );

      // Add a small delay between requests to avoid rate limiting
      if (i < totalScreenshots - 1) {
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenRequests));
      }
    } catch (error) {
      spinner.fail(`Failed to process ${screenshot.day}/${screenshot.fileName}`);
      console.error(
        chalk.red(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );

      results.push({
        file: screenshot,
        extracted: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: 0,
      });
    }
  }

  return results;
}

// Error handling
process.on('unhandledRejection', error => {
  console.error(chalk.red('Unhandled promise rejection:'), error);
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.error(chalk.red('Uncaught exception:'), error);
  process.exit(1);
});

// Run the program
program.parse();
