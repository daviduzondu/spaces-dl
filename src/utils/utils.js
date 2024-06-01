const ffmpeg = require('fluent-ffmpeg');
// const ffmpegPath = require('ffmpeg-static');
const { PassThrough } = require('stream');
const fs = require('fs');

// Combine all the buffers into one single buffer and write to disk.
// This is probably retarded. There's probably better ways of doing this. :-(
async function combineAndWriteToDisk(buffers, outputFilePath, initMessage, completeMessage) {
  try {
    console.log(initMessage);
    // Concatenate all the file buffers into a single Buffer
    const concatenatedBuffer = Buffer.concat(buffers);
    // Write the concatenated Buffer to a file
    fs.writeFileSync(outputFilePath, concatenatedBuffer);
    console.log(completeMessage);
  } catch (error) {
    console.error('Error combining and writing file:', error);
  }
}

async function renderMessage(msg, type = 'info') {}

async function convertBuffersToMP3(buffers, outputFilePath) {
  return new Promise((resolve, reject) => {
    const passThroughStream = new PassThrough();

    // Feed buffers into the stream
    for (const buffer of buffers) {
      passThroughStream.write(buffer);
    }

    passThroughStream.end();

    // Use ffmpeg to convert the stream
    ffmpeg(passThroughStream)
      .inputFormat('aac') // Specify input format
      .toFormat('mp3') // Specify output format
      .on('end', () => {
        console.log('Conversion complete');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error during conversion:', err);
        reject(err);
      })
      .save(outputFilePath);
  });
}

async function cache(path, data) {
  try {
    return fs.writeFile(path, data);
  } catch (error) {
    throw error;
  }
}

module.exports = { combineAndWriteToDisk, convertBuffersToMP3, cache };
