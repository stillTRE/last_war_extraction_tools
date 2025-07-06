import fs from 'fs-extra';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import * as XLSX from 'xlsx';
import { ExtractedData, ExportOptions, WeekData } from '../schema.js';
import { writeFileSync } from 'fs';

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

    // Use the filename from the options if it includes a date, otherwise generate one
    // This ensures we use the same filename as the backup when possible
    let outputPath;
    if (path.basename(options.outputPath).includes('_20')) {
      // If the path already includes a date (like yyyy-mm-dd), use it directly
      outputPath = options.outputPath;
      console.log(`Using provided filename: ${outputPath}`);
    } else {
      // TODO: Not great naming convention. Can be better. Perhaps here since export over the TODO in index.
      const baseName = `week${week.weekNumber}_${new Date().toISOString().split('T')[0]}`;
      const ext = `.${options.format}`;
      outputPath = path.join(baseDir, baseName + ext);
      console.log(`Generated filename: ${outputPath}`);
    }

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

    // Ensure the directory exists
    await fs.ensureDir(path.dirname(outputPath));

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

    // Ensure the directory exists
    await fs.ensureDir(baseDir);

    // Export daily data to separate files if we have any
    if (week.dailyData.length > 0) {
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
    } else if (week.dailyData.length === 0) {
      // If we have no data at all
      throw new Error('No data to export - both daily and weekly data are empty');
    }

    return `Exported week ${week.weekNumber} to ${exportedFiles.length} CSV files`;
  }

  /**
   * Export to XLSX format with separate sheets for each day
   */
  private static async exportToXLSX(week: WeekData, outputPath: string): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Add a sheet for each day
    if (week.dailyData.length > 0) {
      for (const day of week.dailyData) {
        const sheetData = day.entries.map(entry => ({
          Rank: entry.rank,
          CommanderName: entry.commanderName,
          Points: entry.points,
        }));

        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, day.day);
      }
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
    } else {
      // If we have no data at all, we can't export an empty workbook
      throw new Error('No data to export - both daily and weekly data are empty');
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

    // Ensure the directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Write the file using a different approach to avoid ES module issue with XLSX.writeFile
    try {
      console.log(`Attempting to write XLSX file to: ${outputPath}`);

      // Convert workbook to a buffer
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      // Write the buffer to the file using Node's fs.writeFileSync
      writeFileSync(outputPath, wbout);

      console.log(`Successfully wrote XLSX file to: ${outputPath}`);
    } catch (xlsxError) {
      console.error(`Error writing XLSX file: ${xlsxError}`);
      console.error(`Error details:`, xlsxError);
      throw new Error(
        `Failed to write XLSX file: ${xlsxError instanceof Error ? xlsxError.message : String(xlsxError)}`
      );
    }
    return `Exported week ${week.weekNumber} to ${outputPath}`;
  }
}
