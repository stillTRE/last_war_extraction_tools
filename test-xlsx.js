// Simple test script for XLSX export
import fs from 'fs-extra';
import * as XLSX from 'xlsx';
import path from 'path';
import { writeFileSync } from 'fs';

// Create a simple workbook
const createWorkbook = () => {
  const workbook = XLSX.utils.book_new();

  // Create a worksheet with some data
  const worksheetData = [
    { Name: 'John', Rank: 1, Points: 1000 },
    { Name: 'Alice', Rank: 2, Points: 900 },
    { Name: 'Bob', Rank: 3, Points: 800 },
  ];

  // Convert JSON to worksheet
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Sheet');

  return workbook;
};

// Main function
const main = async () => {
  try {
    console.log('Starting XLSX test...');

    // Create a results directory if it doesn't exist
    const outputDir = 'results';
    await fs.ensureDir(outputDir);
    console.log(`Ensured directory: ${outputDir}`);

    // Create the workbook
    const workbook = createWorkbook();
    console.log('Created workbook');

    // File path
    const filePath = path.join(outputDir, 'test-output.xlsx');
    console.log(`Attempting to write to: ${filePath}`);

    // Try to write the file
    try {
      // Convert workbook to a buffer
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      // Write the buffer to the file using Node's fs.writeFileSync
      writeFileSync(filePath, wbout);

      console.log(`Successfully wrote file to: ${filePath}`);
    } catch (writeError) {
      console.error('Error during file write:');
      console.error(writeError);
    }

    // Verify file exists
    const exists = await fs.pathExists(filePath);
    console.log(`File exists after write: ${exists}`);

    if (exists) {
      // Get file info
      const stats = await fs.stat(filePath);
      console.log(`File size: ${stats.size} bytes`);
    }
  } catch (error) {
    console.error('Test failed:');
    console.error(error);
  }
};

// Run the test
main().catch(err => {
  console.error('Unhandled error:');
  console.error(err);
});
