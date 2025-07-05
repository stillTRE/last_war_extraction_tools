import * as fs from 'fs-extra';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import * as XLSX from 'xlsx';
import { ExtractedData, ExportOptions, WeekData } from '../schema';

export class ExportUtils {
  /**
   * Export data to the specified format
   * This implementation focuses on exporting a single week of data
   */
  static async exportData(data: ExtractedData, options: ExportOptions): Promise<string> {
    await fs.ensureDir(path.dirname(options.outputPath));

    // Extract the most recent week (assuming weeks are sorted by weekNumber)
    const week = data.weeks.length > 0 ? data.weeks[data.weeks.length - 1] : null;

    if (!week) {
      throw new Error('No week data available to export');
    }

    // Create filename based on week
    const baseDir = path.dirname(options.outputPath);
    // TODO: Not great naming convention. Can be better. Perhaps here since export over the TODO in index.
    const baseName = `week${week.weekNumber}_${week.weekDate}`;
    const ext = `.${options.format}`;

    const outputPath = path.join(baseDir, baseName + ext);

    // Export based on format
    switch (options.format) {
      case 'json':
        return this.exportToJSON(
          week,
          outputPath,
          options.includeMetadata ? data.metadata : undefined
        );
      case 'csv':
        return this.exportToCSV(week, outputPath);
      case 'xlsx':
        return this.exportToXLSX(week, outputPath);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to JSON format
   */
  private static async exportToJSON(
    week: WeekData,
    outputPath: string,
    metadata?: { totalWeeks: number; totalScreenshots: number; extractedAt: string }
  ): Promise<string> {
    const jsonData = metadata ? { week, metadata } : { week };

    await fs.writeJSON(outputPath, jsonData, { spaces: 2 });
    return `Exported week ${week.weekNumber} to ${outputPath}`;
  }

  /**
   * Export to CSV format - creates separate files for each day
   */
  private static async exportToCSV(week: WeekData, outputPath: string): Promise<string> {
    const baseDir = path.dirname(outputPath);
    const baseName = path.basename(outputPath, '.csv');
    const exportedFiles: string[] = [];

    // Export daily data to separate files
    for (const day of week.dailyData) {
      const dayFile = path.join(baseDir, `${baseName}_${day.day}.csv`);

      const records = day.entries.map(entry => ({
        Rank: entry.rank,
        CommanderName: entry.commanderName,
        Points: entry.points,
      }));

      const csvWriter = createObjectCsvWriter({
        path: dayFile,
        header: [
          { id: 'Rank', title: 'Rank' },
          { id: 'CommanderName', title: 'Commander Name' },
          { id: 'Points', title: 'Points' },
        ],
      });

      await csvWriter.writeRecords(records);
      exportedFiles.push(dayFile);
    }

    // Export weekly data if present
    if (week.weeklyData.length > 0) {
      const weeklyFile = path.join(baseDir, `${baseName}_Weekly.csv`);

      const records = week.weeklyData.map(entry => ({
        Rank: entry.rank,
        CommanderName: entry.commanderName,
        Points: entry.points,
      }));

      const csvWriter = createObjectCsvWriter({
        path: weeklyFile,
        header: [
          { id: 'Rank', title: 'Rank' },
          { id: 'CommanderName', title: 'Commander Name' },
          { id: 'Points', title: 'Points' },
        ],
      });

      await csvWriter.writeRecords(records);
      exportedFiles.push(weeklyFile);
    }

    return `Exported week ${week.weekNumber} to ${exportedFiles.length} CSV files`;
  }

  /**
   * Export to XLSX format with separate sheets for each day
   */
  private static async exportToXLSX(week: WeekData, outputPath: string): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Add a sheet for each day
    for (const day of week.dailyData) {
      const sheetData = day.entries.map(entry => ({
        Rank: entry.rank,
        CommanderName: entry.commanderName,
        Points: entry.points,
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, day.day);
    }

    // Add weekly data if present
    if (week.weeklyData.length > 0) {
      const sheetData = week.weeklyData.map(entry => ({
        Rank: entry.rank,
        CommanderName: entry.commanderName,
        Points: entry.points,
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly');
    }

    // Add a summary sheet
    const summaryData = [
      { Metric: 'Week Number', Value: week.weekNumber },
      { Metric: 'Week Date', Value: week.weekDate },
      { Metric: 'Days Tracked', Value: week.dailyData.length },
      {
        Metric: 'Total Daily Entries',
        Value: week.dailyData.reduce((sum, day) => sum + day.entries.length, 0),
      },
      { Metric: 'Weekly Entries', Value: week.weeklyData.length },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Write the file
    XLSX.writeFile(workbook, outputPath);
    return `Exported week ${week.weekNumber} to ${outputPath}`;
  }
}
