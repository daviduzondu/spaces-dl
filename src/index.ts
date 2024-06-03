import * as CONSTANTS from './constants/constants.js';
import axios from 'axios';
import cheerio from 'cheerio';
import m3u8Parser from 'm3u8-parser';
import convertBuffersToMP3 from './utils/';

interface DownloaderInterface {

}

interface DownloaderOptions {
  username: string,
  password: string,
  id: string,
  output?: string
  transcribe?: string
  language?: string
  whisperPath?: string
}

interface Headers {
  'User-Agent': string
  Referer: string
}

export class Downloader implements DownloaderInterface {
  private username: string;
  private password: string;
  private headers: Headers;
  constructor({ username, password }: DownloaderOptions) {
    this.username = username;
    this.password = password;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0',
      Referer: 'https://x.com/sw.js',
    };
  }

  async fetchChatHistory(historyEndpointURL: string, accessToken: string, userAgent: Headers) {
    let chatHistory = [];
    let previousCursor = '';
    let index = 0;
    while (true) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const response = (
          await postRequest(historyEndpointURL, userAgent, {
            cursor: previousCursor,
            access_token: accessToken,
            limit: 1000,
            quick_get: true,
            since: null,
          })
        ).data;

        // Log details for debugging purposes
        console.log(chatHistory.length, ' ', previousCursor, ' ', response.cursor, ' ', response.messages.length);

        // Add new messages to chatHistory
        chatHistory.push(...response.messages);
        index++;

        // Check if there is a new cursor or if there are no more messages
        if (!response.cursor || response.messages.length === 0) {
          break;
        }
        // if (index === 15) {
        //   break;
        // }

        // Update the cursor for the next request
        previousCursor = response.cursor;
      } catch (error) {
        throw new Error('Something went wrong! ' + error);
      }
    }
    return chatHistory;
  }

}