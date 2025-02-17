'use strict';

// Import external dependencies
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration for the GitHub repo to scrape
const OWNER = 'bgthai';
const REPO = 'bgthai.github.io';
// Starting path in the repo (change if needed)
const START_PATH = 'quotes/en';
// Output file to save image IDs
const OUTPUT_FILE = path.join(__dirname, 'image_ids.txt');

// GitHub API base URL
const GITHUB_API_BASE = 'https://api.github.com/repos';

// Optional: Provide a personal access token to avoid rate limits
// const GITHUB_TOKEN = 'your_token_here';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

// Set up axios headers if token provided
const axiosInstance = axios.create({
  headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
});

/**
 * Recursively traverse a repository directory using GitHub API
 * and collect image file IDs (file names without extension)
 *
 * @param {string} repoPath - The repository path to traverse.
 * @returns {Promise<string[]>} - Array of image IDs.
 */
async function getImageIdsFromRepo(repoPath) {
  let imageIds = [];
  const url = `${GITHUB_API_BASE}/${OWNER}/${REPO}/contents/${repoPath}`;
  
  try {
    const { data } = await axiosInstance.get(url);
    
    // Iterate over all items in the current folder
    for (const item of data) {
      if (item.type === 'dir') {
        // Recursively get image IDs from subdirectories
        const subDirIds = await getImageIdsFromRepo(item.path);
        imageIds = imageIds.concat(subDirIds);
      } else if (item.type === 'file') {
        // Check if the file is an image (for example, jpg files)
        if (/\.(jpg|jpeg|png)$/i.test(item.name)) {
          // Remove the extension to extract the image id
          const imageId = path.basename(item.name, path.extname(item.name));
          imageIds.push(imageId);
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching contents from ${repoPath}:`, error.message);
  }
  
  return imageIds;
}

/**
 * Writes an array of strings to a text file (one per line)
 *
 * @param {string[]} lines - Array of strings to write.
 * @param {string} filePath - Destination file path.
 */
function writeLinesToFile(lines, filePath) {
  const content = lines.join('\n');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Saved ${lines.length} image IDs to ${filePath}`);
}

/**
 * Main function to start scraping and saving image IDs.
 */
async function main() {
  console.log(`Scraping image IDs from ${OWNER}/${REPO}/${START_PATH} ...`);
  const imageIds = await getImageIdsFromRepo(START_PATH);
  // Optionally, sort and remove duplicates
  const uniqueIds = Array.from(new Set(imageIds)).sort();
  writeLinesToFile(uniqueIds, OUTPUT_FILE);
}

main().catch(error => console.error('Error in main execution:', error));
