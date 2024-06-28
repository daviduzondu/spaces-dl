import ffmpeg from 'fluent-ffmpeg';
import fsPromises from 'fs/promises';
import chalk from 'chalk';
import { PassThrough } from 'stream';
import readline from 'readline';
import * as https from 'https';
import axios, { AxiosHeaders, AxiosRequestHeaders, AxiosResponse, ResponseType } from 'axios';
import { TaskHeaders, MessageType } from '../types.js';

export async function convertBuffersToMP3(buffers: [], outputFilePath: string) {
  return new Promise<void>((resolve, reject) => {
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


export async function getRequest(url: string, headers: TaskHeaders, responseType?: ResponseType): Promise<AxiosResponse> {
  try {
    const response = await axios.get(url, {
      headers,
      responseType: responseType,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      validateStatus: function (status) {
        return status < 500; // Reject only if the status code is 500 or greater
      },
    });
    return response;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Axios error: ${error.message}`);
    } else {
      throw new Error(`Unexpected error: ${error.message}`);
    }
  }
}


export const print = {
  info: (message: string) => {
    console.log(`${chalk.bgBlue('[INFO]')} ${message}`);
  },
  warn: (message: string) => {
    console.log(`${chalk.bgYellow('[WARN]')} ${message}`);
  },
  success: (message: string) => {
    console.log(`\n${chalk.bgGreen.black.bold('[SUCCESS]')} ${message}`);
  },
  default: (message: string) => {
    console.log(`${chalk.bgBlue('[*]')} ${message}`);
  },
  error: (message: string) => {
    console.log(`${chalk.bgRed("[ERROR]")} ${message}`)
  },
  progress: (completed: number, total: number, message: string, tag: string = 'TASK') => {
    const maxMessageLength = Math.floor(process.stdout.columns * 60 / 100); // 30% of the current width
    if (message.length > maxMessageLength) message = [message.substring(0, Math.floor(message.length / 4)), '...', message.substring(message.length - 3)].join('');
    const barLength = Math.floor(maxMessageLength / 5); // Length of the progress bar
    const percentage: number = Number((completed / total)); // Calculate the percentage completed
    const completedLength = Math.round(barLength * percentage); // Number of filled slots in the bar
    const bar = '█'.repeat(completedLength) + '░'.repeat(barLength - completedLength); // Construct the bar
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`${chalk.bgYellow.black.bold("[" + tag + "]")} ${message} [${bar}] ${(percentage * 100).toFixed(2)}% `); // Write the bar and the percentage

    if ((completed >= total)) {
      console.log("");
    }
  }
};

// Function to perform POST request with specified headers and data
export async function postRequest(url: string, headers: any, data: {}): Promise<AxiosResponse> {
  try {
    const response = await axios.post(url, data, {
      headers,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      validateStatus: function (status) {
        return status < 500; // Reject only if the status code is 500 or greater
      },
    });
    return response;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Axios error: ${error.message}`);
    } else {
      throw new Error(`Unexpected error: ${error.message}`);
    }
  }
}

