import { WeekData, DayData, ExtractedData, ProcessingResult, DayOfWeek } from '../schema';

export class DataProcessor {
  /**
   * Process screenshot results for a single week and organize them into structured data
   * This implementation focuses on processing a single week of data at a time
   */
  static processResults(results: ProcessingResult[]): ExtractedData {
    let totalScreenshots = 0;
    let weekNumber = 0;
    let weekName = '';

    // Filter out failed results
    const successfulResults = results.filter(result => {
      if (!result.success) {
        console.warn(`Skipping failed result for ${result.file.filePath}: ${result.error}`);
        return false;
      }
      return true;
    });

    if (successfulResults.length === 0) {
      throw new Error('No successful results to process');
    }

    // Extract week information from the first successful result
    weekName = successfulResults[0]?.file.week || 'week1';
    weekNumber = this.extractWeekNumber(weekName);
    totalScreenshots = successfulResults.length;

    // Create the week data structure
    const weekData: WeekData = {
      weekNumber,
      weekDate: this.calculateWeekStartDate(weekName),
      dailyData: [],
      weeklyData: [],
    };

    // Process each result
    for (const result of successfulResults) {
      this.addResultToWeekData(weekData, result);
    }

    // Sort daily data
    weekData.dailyData = this.sortDailyData(weekData.dailyData);

    // Return the processed data
    return {
      weeks: [weekData],
      metadata: {
        totalWeeks: 1,
        totalScreenshots,
        extractedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Add a processing result to the week data
   */
  private static addResultToWeekData(weekData: WeekData, result: ProcessingResult): void {
    const dayName = this.normalizeDayName(result.file.day);

    if (dayName === DayOfWeek.WEEKLY) {
      // This is weekly summary data
      weekData.weeklyData.push(...result.extracted);

      // Sort weekly data by rank
      weekData.weeklyData.sort((a, b) => a.rank - b.rank);
    } else {
      // This is daily data
      let dayData = weekData.dailyData.find(d => d.day === dayName);

      if (!dayData) {
        dayData = {
          day: dayName,
          entries: [],
        };
        weekData.dailyData.push(dayData);
      }

      // Merge entries, avoiding duplicates based on rank
      const existingRanks = new Set(dayData.entries.map(e => e.rank));
      const newEntries = result.extracted.filter(e => !existingRanks.has(e.rank));

      dayData.entries.push(...newEntries);
      dayData.entries.sort((a, b) => a.rank - b.rank);
    }
  }

  /**
   * Extract week number from week directory name
   */
  private static extractWeekNumber(weekDir: string): number {
    const match = weekDir.match(/week(\d+)/i);
    return match ? parseInt(match[1]!, 10) : 0;
  }

  /**
   * Calculate the start date of a week
   */
  private static calculateWeekStartDate(weekDir: string): string {
    const weekNumber = this.extractWeekNumber(weekDir);
    const baseDate = new Date('2024-01-01'); // Adjust this base date as needed
    baseDate.setDate(baseDate.getDate() + (weekNumber - 1) * 7);
    return baseDate.toISOString().split('T')[0]!;
  }

  /**
   * Normalize day name to standard format
   */
  private static normalizeDayName(dayName: string): string {
    const normalized = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();

    // Check if it's a valid day
    const validDays = Object.values(DayOfWeek);
    const matchingDay = validDays.find(day => day.toLowerCase() === normalized.toLowerCase());

    return matchingDay || normalized;
  }

  /**
   * Sort daily data by day order
   */
  private static sortDailyData(dailyData: DayData[]): DayData[] {
    const dayOrder = {
      [DayOfWeek.MONDAY]: 1,
      [DayOfWeek.TUESDAY]: 2,
      [DayOfWeek.WEDNESDAY]: 3,
      [DayOfWeek.THURSDAY]: 4,
      [DayOfWeek.FRIDAY]: 5,
      [DayOfWeek.SATURDAY]: 6,
      [DayOfWeek.WEEKLY]: 7,
    };

    return dailyData.sort((a, b) => {
      const orderA = dayOrder[a.day as keyof typeof dayOrder] || 999;
      const orderB = dayOrder[b.day as keyof typeof dayOrder] || 999;
      return orderA - orderB;
    });
  }

  /**
   * Basic validation for a single week of data
   */
  static validateWeekData(weekData: WeekData): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (weekData.weekNumber <= 0) {
      issues.push(`Invalid week number: ${weekData.weekNumber}`);
    }

    if (!weekData.weekDate) {
      issues.push('Missing week date');
    }

    // Check daily data
    if (weekData.dailyData.length === 0) {
      issues.push('No daily data found');
    } else {
      weekData.dailyData.forEach(day => {
        if (!day.day || !Object.values(DayOfWeek).includes(day.day as any)) {
          issues.push(`Invalid day name: ${day.day}`);
        }

        if (!day.entries || day.entries.length === 0) {
          issues.push(`No entries found for day: ${day.day}`);
        } else {
          // Check for duplicate ranks
          const ranks = day.entries.map(e => e.rank);
          const uniqueRanks = new Set(ranks);
          if (ranks.length !== uniqueRanks.size) {
            issues.push(`Duplicate ranks found for day: ${day.day}`);
          }
        }
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get basic summary for the processed data
   */
  static getDataSummary(weekData: WeekData): {
    dayCount: number;
    entryCount: number;
    hasWeeklyData: boolean;
  } {
    const dayCount = weekData.dailyData.length;
    const entryCount = weekData.dailyData.reduce((sum, day) => sum + day.entries.length, 0);
    const hasWeeklyData = weekData.weeklyData.length > 0;

    return {
      dayCount,
      entryCount,
      hasWeeklyData,
    };
  }
}
