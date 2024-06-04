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
    }
};
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
