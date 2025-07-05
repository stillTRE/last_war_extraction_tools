import { z } from 'zod';
import { Config, ConfigSchema } from '../schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class ConfigUtils {
  /**
   * Default configuration with reasonable values
   */
  private static defaultConfig: Config = {
    aiProvider: {
      name: 'openai',
      endpoint: 'https://api.openai.com',
      model: 'gpt-4-vision-preview',
    },
    inputDirectory: './screenshots',
    outputDirectory: './output',
    exportFormat: 'json',
    delayBetweenRequests: 1000,
  };

  /**
   * Load configuration with environment variable overrides
   */
  static loadConfig(): Config {
    // Start with default config
    let config = { ...this.defaultConfig };

    // Only check for API key in environment variables
    if (process.env.AI_API_KEY) {
      config.aiProvider.apiKey = process.env.AI_API_KEY;
    }

    // Validate configuration using Zod
    try {
      return ConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Configuration validation failed:');
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
      }
      console.error('Using default configuration with available valid settings');
      // Return best-effort config even if validation fails
      return config;
    }
  }

  /**
   * Estimate processing costs based on the provider and model
   */
  static estimateCost(
    screenshotCount: number,
    provider: string = 'openai',
    model?: string
  ): string {
    let costPerImage: number;
    let modelName: string;

    // Set cost and model based on provider
    if (provider === 'anthropic') {
      costPerImage = 0.015; // Approximate cost for Claude 3
      modelName = model || 'Claude 3 Opus';
    } else {
      // Default to OpenAI pricing
      costPerImage = 0.01; // Approximate cost for GPT-4 Vision
      modelName = model || 'GPT-4 Vision';
    }

    const estimatedCost = screenshotCount * costPerImage;
    return `Estimated cost: $${estimatedCost.toFixed(2)} USD (${modelName})`;
  }
}
