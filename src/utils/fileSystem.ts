import fs from 'fs-extra';
import * as path from 'path';
import { ScreenshotFile, DayOfWeek } from '../schema.js';

export class FileSystemUtils {
  /**
   * Scan the input directory for screenshot files organized by week/day structure
   * Expected structure: /week1/Monday/, /week1/Tuesday/, etc.
   */
  static async scanScreenshotDirectory(basePath: string): Promise<ScreenshotFile[]> {
    const screenshots: ScreenshotFile[] = [];

    try {
      // Check if base directory exists
      if (!(await fs.pathExists(basePath))) {
        throw new Error(`Base directory does not exist: ${basePath}`);
      }

      // Check if images are directly in the base directory
      const baseImages = await this.getImageFiles(basePath);
      if (baseImages.length > 0) {
        // Handle simple mode: images directly in the base directory
        for (const file of baseImages) {
          const filePath = path.join(basePath, file);
          const stats = await fs.stat(filePath);

          screenshots.push({
            fileName: file,
            filePath,
            week: path.basename(basePath),
            day: 'Weekly',
            size: stats.size,
            createdAt: stats.birthtime,
          });
        }
        return screenshots;
      }

      // Get all week directories
      const weekDirs = await this.getWeekDirectories(basePath);

      for (const weekDir of weekDirs) {
        const weekPath = path.join(basePath, weekDir);
        const dayDirs = await this.getDayDirectories(weekPath);

        for (const dayDir of dayDirs) {
          const dayPath = path.join(weekPath, dayDir);
          const files = await this.getImageFiles(dayPath);

          for (const file of files) {
            const filePath = path.join(dayPath, file);
            const stats = await fs.stat(filePath);

            screenshots.push({
              fileName: file,
              filePath,
              week: weekDir,
              day: dayDir,
              size: stats.size,
              createdAt: stats.birthtime,
            });
          }
        }
      }

      return screenshots.sort((a, b) => {
        // Sort by week, then by day order
        const weekCompare = this.compareWeeks(a.week, b.week);
        if (weekCompare !== 0) return weekCompare;

        return this.compareDays(a.day, b.day);
      });
    } catch (error) {
      throw new Error(
        `Failed to scan screenshot directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all week directories from the base path
   */
  private static async getWeekDirectories(basePath: string): Promise<string[]> {
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && this.isWeekDirectory(entry.name))
      .map(entry => entry.name)
      .sort(this.compareWeeks);
  }

  /**
   * Get all day directories from a week path
   */
  private static async getDayDirectories(weekPath: string): Promise<string[]> {
    const entries = await fs.readdir(weekPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && this.isDayDirectory(entry.name))
      .map(entry => entry.name)
      .sort(this.compareDays);
  }

  /**
   * Get all image files from a day directory
   */
  private static async getImageFiles(dayPath: string): Promise<string[]> {
    const entries = await fs.readdir(dayPath);
    return entries.filter(file => this.isImageFile(file)).sort(); // Sort alphabetically
  }

  /**
   * Check if a directory name represents a week
   */
  private static isWeekDirectory(name: string): boolean {
    // Match patterns like: week1, week2, Week1, WEEK1, etc.
    // Also allow just "week" as a directory name
    return /^week\d*$/i.test(name);
  }

  /**
   * Check if a directory name represents a day
   */
  private static isDayDirectory(name: string): boolean {
    const validDays = Object.values(DayOfWeek);
    return (
      validDays.includes(name as DayOfWeek) ||
      validDays.some(day => day.toLowerCase() === name.toLowerCase())
    );
  }

  /**
   * Check if a file is an image
   */
  private static isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const ext = path.extname(fileName).toLowerCase();
    return imageExtensions.includes(ext);
  }

  /**
   * Compare two week directory names for sorting
   */
  private static compareWeeks(a: string, b: string): number {
    const getWeekNumber = (week: string): number => {
      const match = week.match(/week(\d+)/i);
      return match ? parseInt(match[1]!, 10) : 0;
    };

    return getWeekNumber(a) - getWeekNumber(b);
  }

  /**
   * Compare two day directory names for sorting
   */
  private static compareDays(a: string, b: string): number {
    const dayOrder = {
      [DayOfWeek.MONDAY]: 1,
      [DayOfWeek.TUESDAY]: 2,
      [DayOfWeek.WEDNESDAY]: 3,
      [DayOfWeek.THURSDAY]: 4,
      [DayOfWeek.FRIDAY]: 5,
      [DayOfWeek.SATURDAY]: 6,
      [DayOfWeek.WEEKLY]: 7,
    };

    const getDayOrder = (day: string): number => {
      const normalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();

      // Try to match the normalized day with a day of week enum value
      for (const [key, value] of Object.entries(DayOfWeek)) {
        if (value === normalizedDay) {
          return dayOrder[value as DayOfWeek] || 999;
        }
      }

      return 999;
    };

    return getDayOrder(a) - getDayOrder(b);
  }

  /**
   * Create output directory structure
   */
  static async ensureOutputDirectory(outputPath: string): Promise<void> {
    await fs.ensureDir(outputPath);
  }

  /**
   * Read image file as base64 string
   */
  static async readImageAsBase64(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer.toString('base64');
    } catch (error) {
      throw new Error(
        `Failed to read image file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get file size in a human-readable format
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Validate directory structure
   */
  static async validateDirectoryStructure(basePath: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      if (!(await fs.pathExists(basePath))) {
        issues.push(`Base directory does not exist: ${basePath}`);
        return { valid: false, issues };
      }

      // First check if basePath itself contains image files (simple mode)
      const baseImages = await this.getImageFiles(basePath);
      if (baseImages.length > 0) {
        // Images directly in the base directory is valid
        return { valid: true, issues: [] };
      }

      // Otherwise, look for week directories
      const weekDirs = await this.getWeekDirectories(basePath);

      if (weekDirs.length === 0) {
        issues.push('No week directories found');
      }

      for (const weekDir of weekDirs) {
        const weekPath = path.join(basePath, weekDir);
        const dayDirs = await this.getDayDirectories(weekPath);

        if (dayDirs.length === 0) {
          issues.push(`No day directories found in ${weekDir}`);
        }

        for (const dayDir of dayDirs) {
          const dayPath = path.join(weekPath, dayDir);
          const imageFiles = await this.getImageFiles(dayPath);

          if (imageFiles.length === 0) {
            issues.push(`No image files found in ${weekDir}/${dayDir}`);
          }
        }
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(
        `Failed to validate directory structure: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { valid: false, issues };
    }
  }
}
