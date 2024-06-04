var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import ffmpeg from 'fluent-ffmpeg';
import chalk from 'chalk';
import { PassThrough } from 'stream';
import * as https from 'https';
import axios from 'axios';
export function convertBuffersToMP3(buffers, outputFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
export function getRequest(url, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios.get(url, {
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
    });
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
export function postRequest(url, headers, data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios.post(url, data, {
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
    });
}
