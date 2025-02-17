'use strict';

// ==========================
// Import external dependencies
// ==========================
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ==========================
// Configuration
// ==========================
const OWNER = 'bgthai';
const REPO = 'bgthai.github.io';
// Base GitHub API URL for repo contents
const GITHUB_API_BASE = 'https://api.github.com/repos';

// Google Apps Script endpoint template for image download
// It expects an image id as a query parameter.
const GOOGLE_SCRIPT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyOrx1xd10IG-VpZAF4HUOIA3wk0YkJa0IRVgNtbFBLrcHmA55eYTMWbsGwPHW1O5yiEQ/exec';

// Optionally provide a GitHub token (set process.env.GITHUB_TOKEN)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

// Create an axios instance with GitHub token if provided.
const axiosInstance = axios.create({
  headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
});

// ==========================
// Helper: Recursively fetch file info from a repo folder
// ==========================
/**
 * Recursively traverses the repository folder and returns an array of image file objects.
 * Each object contains:
 *   - id: the image ID (file name without extension)
 *   - relativePath: the path relative to the base (for folder structure replication)
 *
 * @param {string} repoPath - The current repo path (e.g. "quotes/en" or "quotes/th/15")
 * @param {string} relativePath - The accumulated local relative path (default: empty string)
 * @returns {Promise<Array<{id: string, relativePath: string}>>}
 */
async function getImageFilesFromRepo(repoPath, relativePath = '') {
  let files = [];
  const url = `${GITHUB_API_BASE}/${OWNER}/${REPO}/contents/${repoPath}`;

  try {
    const { data } = await axiosInstance.get(url);
    // Loop through each item in the current folder
    for (const item of data) {
      if (item.type === 'dir') {
        // Recursively traverse the directory.
        const subRelative = path.join(relativePath, item.name);
        const subFiles = await getImageFilesFromRepo(item.path, subRelative);
        files = files.concat(subFiles);
      } else if (item.type === 'file' && /\.(jpg|jpeg|png)$/i.test(item.name)) {
        // Extract image id from the file name (remove extension)
        const imageId = path.basename(item.name, path.extname(item.name));
        // The file will be saved under relativePath (which may be empty)
        files.push({ id: imageId, relativePath });
      }
    }
  } catch (error) {
    console.error(`Error fetching contents from ${repoPath}:`, error.message);
  }
  return files;
}

// ==========================
// Helper: Download a single image by id and save it preserving folder structure
// ==========================
/**
 * Downloads an image using its imageId via the Google Apps Script endpoint,
 * then saves it in the local folder: images/<lang>/<relativePath>/ with filename <imageId>.jpg.
 *
 * @param {{id: string, relativePath: string}} fileObj - Object containing image id and relative path.
 * @param {string} lang - The language folder ("en" or "th").
 */
async function downloadImage(fileObj, lang) {
  const { id, relativePath } = fileObj;
  // Build the download URL by appending the image id as a query parameter.
  const scriptUrl = `${GOOGLE_SCRIPT_ENDPOINT}?id=${id}`;

  try {
    // Fetch the image data (as text, which contains document.write(...)).
    const response = await axios.get(scriptUrl, { responseType: 'text' });
    const responseText = response.data;

    // Extract the base64 image data from the HTML response.
    // Expected format: document.write('<img src="data:image/jpeg;base64,...">');
    const regex = /src="data:image\/[^;]+;base64,([^"]+)"/;
    const match = responseText.match(regex);
    if (!match || match.length < 2) {
      console.error(`Could not extract image data for image id: ${id}`);
      return;
    }
    const base64Data = match[1];
    // Convert base64 string into a binary buffer.
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Build the local destination folder: images/<lang>/<relativePath>
    const destFolder = path.join(__dirname, 'images', lang, relativePath);
    // Ensure the destination folder exists.
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }
    // Destination file path.
    const outputFilePath = path.join(destFolder, `${id}.jpg`);
    // Save the image file.
    fs.writeFileSync(outputFilePath, imageBuffer);
    console.log(`Image ${id} saved as ${outputFilePath}`);
  } catch (error) {
    console.error(`Error downloading image with id ${id}:`, error.message);
  }
}

// ==========================
// Main function: Download images for a given language (folder structure replication)
// ==========================
/**
 * Downloads images for a specified language by:
 *  1. Recursively fetching the GitHub repo folder structure (for that language).
 *  2. Downloading each image and saving it under images/<lang>/<relativePath>/.
 *
 * @param {string} lang - Language code ("en" or "th").
 */
async function downloadImagesForLanguage(lang) {
  // Set the repository base path for the language (e.g., "quotes/en" or "quotes/th").
  const baseRepoPath = `quotes/${lang}`;
  console.log(`Scraping image file info from ${OWNER}/${REPO}/${baseRepoPath} ...`);
  const imageFiles = await getImageFilesFromRepo(baseRepoPath);
  console.log(`Found ${imageFiles.length} images for ${lang}. Starting downloads...`);

  // Download each image sequentially (to avoid overloading the endpoint).
  for (const fileObj of imageFiles) {
    console.log(`Downloading ${lang} image: ${fileObj.id} (folder: ${fileObj.relativePath || '.'})`);
    await downloadImage(fileObj, lang);
  }
}

// ==========================
// Execute for both languages
// ==========================
async function main() {
  // You can adjust which languages to process. Here we process both "en" and "th".
  await downloadImagesForLanguage('en');
  await downloadImagesForLanguage('th');
  console.log('All downloads completed.');
}

main().catch(error => console.error('Error in main execution:', error));
