import ffmpeg from 'fluent-ffmpeg';
import chalk from 'chalk';
import { PassThrough } from 'stream';
import * as https from 'https';
import axios from 'axios';
export async function convertBuffersToMP3(buffers, outputFilePath) {
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
export async function getRequest(url, headers) {
    try {
        const response = await axios.get(url, {
            headers,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            validateStatus: function (status) {
                return status < 500; // Reject only if the status code is 500 or greater
            },
        });
        return response;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Axios error: ${error.message}`);
        }
        else {
            throw new Error(`Unexpected error: ${error.message}`);
        }
    }
}
export const print = {
    info: (message) => {
        console.log(`${chalk.bgBlue('[INFO]')} ${message}`);
    },
    warn: (message) => {
        console.log(`${chalk.bgYellow('[WARN]')} ${message}`);
    },
    success: (message) => {
        console.log(`${chalk.bgGreen.black.bold('[SUCCESS]')} ${message}`);
    },
    default: (message) => {
        console.log(`${chalk.bgBlue('[*]')} ${message}`);
    },
    error: (message) => {
        console.log(`${chalk.bgRed("[ERROR]")} ${message}`);
    }
};
const getMaxNextLine = (input, maxChars = 20) => {
    // Split the string into an array of words.
    const allWords = input.split(" ");
    // Find the index in the words array at which we should stop or we will exceed
    // maximum characters.
    const lineIndex = allWords.reduce((prev, cur, index) => {
        if (prev?.done)
            return prev;
        const endLastWord = prev?.position || 0;
        const position = endLastWord + 1 + cur.length;
        return position >= maxChars ? { done: true, index } : { position, index };
    });
    // Using the index, build a string for this line ...
    const line = allWords.slice(0, lineIndex.index).join(" ");
    // And determine what's left.
    const remainingChars = allWords.slice(lineIndex.index).join(" ");
    // Return the result.
    return { line, remainingChars };
};
export function formatTitle(title) {
    let output = [];
    // If the title is 40 characters or longer, look to add ellipses at the end of
    // the second line.
    if (title.length >= 40) {
        const firstLine = getMaxNextLine(title);
        const secondLine = getMaxNextLine(firstLine.remainingChars);
        output = [firstLine.line];
        let fmSecondLine = secondLine.line;
        if (secondLine.remainingChars.length > 0)
            fmSecondLine += " ...";
        output.push(fmSecondLine);
    }
    // If 20 characters or longer, add the entire second line, using a max of half
    // the characters, making the first line always slightly shorter than the
    // second.
    else if (title.length >= 20) {
        const firstLine = getMaxNextLine(title, title.length / 2);
        output = [firstLine.line, firstLine.remainingChars];
    }
    // Otherwise, return the short title.
    else {
        output = [title];
    }
    return output;
}
// export function printx(message: string, type: MessageType = 'info'): void {
//   switch (type) {
//     case 'info':
//       console.log(chalk.bgBlueBright('[INFO]')``);
//       break;
//     case 'warning':
//       console.log(chalk.yellow(message));
//       break;
//     case 'success':
//       console.log(chalk.green(message));
//       break;
//     case 'error':
//       console.log(chalk.red(message));
//       break;
//     default:
//       console.log(message);
//       break;
//   }
// }
// Function to perform POST request with specified headers and data
export async function postRequest(url, headers, data) {
    try {
        const response = await axios.post(url, data, {
            headers,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            validateStatus: function (status) {
                return status < 500; // Reject only if the status code is 500 or greater
            },
        });
        return response;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Axios error: ${error.message}`);
        }
        else {
            throw new Error(`Unexpected error: ${error.message}`);
        }
    }
}
