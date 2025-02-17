'use strict';

// External dependencies
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Downloads an image from the Google Apps Script endpoint using the provided imageId,
 * then saves it in the /images folder with a filename based on the imageId.
 *
 * @param {string} imageId - The unique image identifier.
 */
async function downloadImageById(imageId) {
  // Construct the Google Apps Script URL by including the imageId as a query parameter.
  const scriptUrl = `https://script.google.com/macros/s/AKfycbyOrx1xd10IG-VpZAF4HUOIA3wk0YkJa0IRVgNtbFBLrcHmA55eYTMWbsGwPHW1O5yiEQ/exec?id=${imageId}`;

  try {
    // Fetch the response from the URL as plain text.
    const response = await axios.get(scriptUrl, { responseType: 'text' });
    const responseText = response.data;

    // Extract the base64 image data from the returned HTML string.
    // The expected format: document.write('<img src="data:image/jpeg;base64,...">');
    const regex = /src="data:image\/[^;]+;base64,([^"]+)"/;
    const match = responseText.match(regex);
    if (!match || match.length < 2) {
      console.error(`Could not extract image data for image id: ${imageId}`);
      return;
    }
    const base64Data = match[1];

    // Convert the base64-encoded string into a binary buffer.
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Define the images folder path (relative to the current script).
    const imagesDir = path.join(__dirname, 'images');

    // Ensure the images directory exists; if not, create it.
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Construct the full file path for the saved image.
    const outputFilePath = path.join(imagesDir, `${imageId}.jpg`);

    // Write the binary image buffer to the file.
    fs.writeFileSync(outputFilePath, imageBuffer);
    console.log(`Image saved as ${outputFilePath}`);
  } catch (error) {
    console.error(`Error downloading image with id ${imageId}:`, error.message);
  }
}

/**
 * Reads image IDs from a text file (one image ID per line).
 *
 * @param {string} filePath - The path to the text file.
 * @returns {string[]} Array of image IDs.
 */
function readImageIds(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Split by newline and filter out any empty lines
    return content.split(/\r?\n/).filter(id => id.trim() !== '');
  } catch (error) {
    console.error(`Error reading image IDs from ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Main function to read image IDs from image_ids.txt and download all images.
 */
async function main() {
  // Define the path to the image IDs file.
  const imageIdsFilePath = path.join(__dirname, 'image_ids.txt');

  // Read image IDs from the file.
  const imageIds = readImageIds(imageIdsFilePath);
  if (imageIds.length === 0) {
    console.error('No image IDs found.');
    return;
  }

  console.log(`Found ${imageIds.length} image IDs. Starting downloads...`);

  // Sequentially download each image.
  for (const id of imageIds) {
    console.log(`Downloading image with ID: ${id}`);
    await downloadImageById(id);
  }

  console.log('All downloads completed.');
}

// Execute the main function.
main().catch(error => console.error('Error in main execution:', error));
