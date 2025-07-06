import { z } from 'zod';

// Days of the week enum
export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  WEEKLY = 'Weekly',
}

// Core data structures for Last War screenshot extraction
export const RankingEntrySchema = z.object({
  rank: z.number(),
  commanderName: z.string(),
  points: z.number(),
});
export type RankingEntry = z.infer<typeof RankingEntrySchema>;

export const DayDataSchema = z.object({
  day: z.string(), // 'Monday', 'Tuesday', etc.
  entries: z.array(RankingEntrySchema),
});
export type DayData = z.infer<typeof DayDataSchema>;

export const WeekDataSchema = z.object({
  weekNumber: z.number(),
  weekDate: z.string(), // e.g., "2024-01-15" for the start of the week
  dailyData: z.array(DayDataSchema),
  weeklyData: z.array(RankingEntrySchema), // Final weekly rankings
});
export type WeekData = z.infer<typeof WeekDataSchema>;

export const ExtractedDataSchema = z.object({
  weeks: z.array(WeekDataSchema),
  metadata: z.object({
    totalWeeks: z.number(),
    totalScreenshots: z.number(),
    extractedAt: z.string(),
  }),
});
export type ExtractedData = z.infer<typeof ExtractedDataSchema>;

// AI Service related types
export const AIProviderSchema = z.object({
  name: z.enum(['openai', 'anthropic']).default('openai'),
  endpoint: z.string(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const AIRequestSchema = z.object({
  imageBase64: z.string(),
  prompt: z.string(),
  model: z.string().optional(),
});
export type AIRequest = z.infer<typeof AIRequestSchema>;

export const AIResponseSchema = z.object({
  extractedText: z.string(),
  rawResponse: z.any().optional(),
});
export type AIResponse = z.infer<typeof AIResponseSchema>;

// File processing types
export const ScreenshotFileSchema = z.object({
  fileName: z.string(),
  filePath: z.string(),
  week: z.string(),
  day: z.string(),
  size: z.number(),
  createdAt: z.date(),
});
export type ScreenshotFile = z.infer<typeof ScreenshotFileSchema>;

export const ProcessingResultSchema = z.object({
  file: ScreenshotFileSchema,
  extracted: z.array(RankingEntrySchema),
  success: z.boolean(),
  error: z.string().optional(),
  processingTime: z.number(),
});
export type ProcessingResult = z.infer<typeof ProcessingResultSchema>;

// Export formats
export const ExportOptionsSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
  outputPath: z.string(),
  includeMetadata: z.boolean().default(false),
});
export type ExportOptions = z.infer<typeof ExportOptionsSchema>;

// Configuration types
export const ConfigSchema = z.object({
  aiProvider: AIProviderSchema,
  inputDirectory: z.string().default('./screenshots'),
  outputDirectory: z.string().default('./output'),
  exportFormat: z.enum(['json', 'csv', 'xlsx']).default('json'),
  delayBetweenRequests: z.number().int().nonnegative().default(1000),
  weeklyOnly: z.boolean().default(false),
});
export type Config = z.infer<typeof ConfigSchema>;

// Error types as classes
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}
