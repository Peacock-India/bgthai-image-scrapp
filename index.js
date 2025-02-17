const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadImageById(imageId) {
  // Construct the URL by passing the image ID as a query parameter.
  const scriptUrl = `https://script.google.com/macros/s/AKfycbyOrx1xd10IG-VpZAF4HUOIA3wk0YkJa0IRVgNtbFBLrcHmA55eYTMWbsGwPHW1O5yiEQ/exec?id=${imageId}`;
  try {
    // Fetch the response as text
    const response = await axios.get(scriptUrl, { responseType: 'text' });
    const responseText = response.data;
    
    // Extract the base64 data from the document.write output
    // Expected output: document.write('<img src="data:image/jpeg;base64,...">');
    const regex = /src="data:image\/[^;]+;base64,([^"]+)"/;
    const match = responseText.match(regex);
    if (!match || match.length < 2) {
      console.error(`Could not extract image data for image id: ${imageId}`);
      return;
    }
    const base64Data = match[1];
    // Convert the base64 string to a binary buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Save the image file (using the imageId as filename)
    const outputFilePath = path.join(__dirname, `${imageId}.jpg`);
    fs.writeFileSync(outputFilePath, imageBuffer);
    console.log(`Image saved as ${outputFilePath}`);
  } catch (error) {
    console.error(`Error downloading image with id ${imageId}:`, error.message);
  }
}

// Retrieve the image ID from the command line arguments.
const imageId = "1OOyqSwTp0Ihxl9TML__sZ7erALfLbIRX"
downloadImageById(imageId);
