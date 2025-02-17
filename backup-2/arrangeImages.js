'use strict';

// External dependencies
const fs = require('fs').promises;
const path = require('path');

/**
 * Reads image IDs from a text file (one per line) and returns them as an array.
 *
 * @param {string} filePath - Path to the text file.
 * @returns {Promise<string[]>} - Array of image IDs.
 */
async function readImageIds(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    // Split by newlines and filter out empty lines
    return content.split(/\r?\n/).map(id => id.trim()).filter(id => id !== '');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Moves a file from the source path to the destination folder.
 * Creates the destination folder if it does not exist.
 *
 * @param {string} sourcePath - Current file path.
 * @param {string} destFolder - Destination folder.
 * @param {string} fileName - Name of the file.
 */
async function moveFileToFolder(sourcePath, destFolder, fileName) {
  try {
    // Ensure the destination folder exists
    await fs.mkdir(destFolder, { recursive: true });
    
    const destPath = path.join(destFolder, fileName);
    await fs.rename(sourcePath, destPath);
    console.log(`Moved ${fileName} to ${destFolder}`);
  } catch (error) {
    console.error(`Error moving file ${fileName}:`, error.message);
  }
}

/**
 * Arranges images into language-specific subfolders based on a list of image IDs.
 *
 * @param {string[]} imageIds - Array of image IDs.
 * @param {string} langFolder - The language subfolder (e.g., 'en' or 'th').
 * @param {string} imagesDir - Base images directory.
 */
async function arrangeImages(imageIds, langFolder, imagesDir) {
  // Define the target folder for this language.
  const targetFolder = path.join(imagesDir, langFolder);

  for (const id of imageIds) {
    // Build the current file path (assumes the images are named like <id>.jpg)
    const fileName = `${id}.jpg`;
    const sourcePath = path.join(imagesDir, fileName);
    try {
      // Check if the file exists at the source path.
      await fs.access(sourcePath);
      // Move the file to the language-specific folder.
      await moveFileToFolder(sourcePath, targetFolder, fileName);
    } catch (error) {
      console.error(`File ${fileName} does not exist in ${imagesDir}:`, error.message);
    }
  }
}

/**
 * Main function to read text files and arrange images.
 */
async function main() {
  // Define paths for the text files and images directory.
  const enIdsFilePath = path.join(__dirname, 'image_ids.txt');      // English IDs file
  const thIdsFilePath = path.join(__dirname, 'th_image_ids.txt');     // Thai IDs file
  const imagesDir = path.join(__dirname, 'images');                   // Base images folder

  // Read image IDs from text files.
  const enImageIds = await readImageIds(enIdsFilePath);
  const thImageIds = await readImageIds(thIdsFilePath);

  console.log(`Found ${enImageIds.length} English image IDs and ${thImageIds.length} Thai image IDs.`);
  
  // Arrange images for English and Thai.
  await arrangeImages(enImageIds, 'en', imagesDir);
  await arrangeImages(thImageIds, 'th', imagesDir);

  console.log('Image arrangement completed.');
}

// Execute the main function.
main().catch(error => console.error('Error in main execution:', error));
