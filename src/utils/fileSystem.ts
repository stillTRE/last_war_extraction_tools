import * as fs from 'fs-extra';
import * as path from 'path';
import { ScreenshotFile, DayOfWeek } from '../schema';

export class FileSystemUtils {
  /**
   * Scan the input directory for screenshot files
   * Expected structure: Either:
   * 1. /weekX/ with subdirectories for each day OR
   * 2. Direct day directories if already in a week directory
   */
  static async scanScreenshotDirectory(inputPath: string): Promise<ScreenshotFile[]> {
    const screenshots: ScreenshotFile[] = [];

    try {
      // Check if base directory exists
      if (!(await fs.pathExists(inputPath))) {
        throw new Error(`Directory does not exist: ${inputPath}`);
      }

      // Check if we're directly in a week directory or need to find one
      const isWeekDir = this.isWeekDirectory(path.basename(inputPath));
      const weekPath = isWeekDir ? inputPath : await this.findMostRecentWeekDir(inputPath);

      if (!weekPath) {
        throw new Error(
          'No week directory found. Please provide a path containing a week directory (e.g., "week1")'
        );
      }

      // Get the week name for tracking
      const weekName = path.basename(weekPath);

      // Get all day directories from the week path
      const dayDirs = await this.getDayDirectories(weekPath);
      if (dayDirs.length === 0) {
        throw new Error(`No day directories found in ${weekPath}`);
      }

      // Process each day directory
      for (const dayDir of dayDirs) {
        const dayPath = path.join(weekPath, dayDir);
        const imageFiles = await this.getImageFiles(dayPath);

        for (const file of imageFiles) {
          const filePath = path.join(dayPath, file);
          const stats = await fs.stat(filePath);

          screenshots.push({
            fileName: file,
            filePath,
            week: weekName,
            day: dayDir,
            size: stats.size,
            createdAt: stats.birthtime,
          });
        }
      }

      // Sort by day order
      return screenshots.sort((a, b) => this.compareDays(a.day, b.day));
    } catch (error) {
      throw new Error(
        `Failed to scan directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find the most recent week directory
   */
  private static async findMostRecentWeekDir(basePath: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      const weekDirs = entries
        .filter(entry => entry.isDirectory() && this.isWeekDirectory(entry.name))
        .map(entry => entry.name)
        .sort(this.compareWeeks);

      return weekDirs.length > 0 ? path.join(basePath, weekDirs[weekDirs.length - 1]!) : null;
    } catch (error) {
      return null;
    }
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
    return entries.filter(file => this.isImageFile(file)).sort();
  }

  /**
   * Check if a directory name represents a week
   */
  private static isWeekDirectory(name: string): boolean {
    return /^week\d+$/i.test(name);
  }

  /**
   * Check if a directory name represents a day
   */
  private static isDayDirectory(name: string): boolean {
    const normalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const validDays = Object.values(DayOfWeek);
    return validDays.includes(normalizedName as DayOfWeek);
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

    const normalizeDay = (day: string): string =>
      day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();

    const dayA = normalizeDay(a);
    const dayB = normalizeDay(b);

    return (
      (dayOrder[dayA as keyof typeof dayOrder] || 999) -
      (dayOrder[dayB as keyof typeof dayOrder] || 999)
    );
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
   * Simple validation of input directory structure
   */
  static async validateDirectoryStructure(inputPath: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      if (!(await fs.pathExists(inputPath))) {
        issues.push(`Directory does not exist: ${inputPath}`);
        return { valid: false, issues };
      }

      // Try to find a week directory
      const isWeekDir = this.isWeekDirectory(path.basename(inputPath));
      const weekPath = isWeekDir ? inputPath : await this.findMostRecentWeekDir(inputPath);

      if (!weekPath) {
        issues.push(
          'No week directory found. Please provide a path containing a week directory (e.g., "week1")'
        );
        return { valid: false, issues };
      }

      // Check day directories
      const dayDirs = await this.getDayDirectories(weekPath);
      if (dayDirs.length === 0) {
        issues.push(`No day directories found in ${path.basename(weekPath)}`);
      } else {
        // Check for images in each day directory
        for (const dayDir of dayDirs) {
          const dayPath = path.join(weekPath, dayDir);
          const imageFiles = await this.getImageFiles(dayPath);

          if (imageFiles.length === 0) {
            issues.push(`No image files found in ${path.basename(weekPath)}/${dayDir}`);
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
