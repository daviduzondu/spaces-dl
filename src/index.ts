import * as CONSTANTS from './constants/constants.js';
import axios, { Axios, AxiosRequestHeaders, AxiosResponse } from 'axios';
import cheerio from 'cheerio';
// import m3u8Parser from 'm3u8-parser';
import { convertBuffersToMP3, getRequest, postRequest, print } from './utils/utils.js';
import { DownloaderOptions, TaskHeaders } from './types.js';
import fsPromises from 'fs/promises';
import path from 'path';
import { whisper } from './lib/whisper.js';
import ffmpeg from 'fluent-ffmpeg';

interface DownloaderInterface {

}

export class Downloader implements DownloaderInterface {
  private username: string;
  private password: string;
  private options!: DownloaderOptions;
  private headers: TaskHeaders;
  private id: string;
  private isLoggedIn: boolean = false;
  private $: any;

  constructor(options: DownloaderOptions) {
    this.options = options;
    this.username = options.username;
    this.password = options.password;
    this.id = options.id;


    this.headers = {
      'User-Agent': 'curl/7.81.0',
      'accept': "*/*",
      Referer: 'https://twitter.com/',
      'Content-Type': 'application/json',
    };

  }

  async init() {
    print.info("Starting authentication flow")
    await this.login();
  }

  async login() {
    try {
      const response: AxiosResponse = await getRequest(CONSTANTS.URL_BASE, this.headers);
      this.$ = cheerio.load(response.data);
      print.info("Retrieving guest token...");
      this.headers['X-Guest-Token'] = await this.getGuestToken();
      this.headers["Authorization"] = CONSTANTS.BEARER;
      // Initialize login flow:
      print.info('Logging in with credentials. Make sure 2FA is disabled on your account');
      let taskResponse: any;
      let taskInputs: any = CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[''].input;
      taskResponse = (await postRequest(CONSTANTS.URL_FLOW_1, this.headers, JSON.stringify(taskInputs)));
      let flowToken: string = taskResponse.data.flow_token;
      // console.log(taskResponse.data)
      let nextSubtask: string = taskResponse.data.subtasks[0].subtask_id;

      const att: string = taskResponse.headers
        .get('set-cookie')
        .find((x: string) => x.startsWith('att='))
        .split('att=')[1]
        .split(';')[0];
      this.setHeaders({ cookie: `att=${att}` });


      while (!this.isLoggedIn) {
        if (Object.keys(CONSTANTS.LOGIN_FLOW_SUBTASK_DATA).find(x => x === nextSubtask)) {
          print.info(`Performing next subtask: ${nextSubtask}`);
        } else {
          throw new Error("Failed to get next subtask");
        }

        if (nextSubtask === 'LoginJsInstrumentationSubtask') {
          taskInputs = { flow_token: flowToken, ...CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask].input };
          taskResponse = await postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
          flowToken = taskResponse.data.flow_token;
          nextSubtask = taskResponse.data.subtasks[0].subtask_id;
        } else if (nextSubtask === 'LoginEnterUserIdentifierSSO') {
          print.default('Submitting username...');
          taskInputs = { flow_token: flowToken, ...CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask](this.username).input }
          taskResponse = await postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
          flowToken = taskResponse.data.flow_token;
          // console.log(taskResponse.data)
          nextSubtask = taskResponse.data.subtasks[0].subtask_id;
        } else if (nextSubtask === 'LoginEnterPassword') {
          print.default('Submitting password...');
          taskInputs = { flow_token: flowToken, ...CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask](this.password).input }
          taskResponse = await postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
          flowToken = taskResponse.data.flow_token;
          nextSubtask = taskResponse.data.subtasks[0].subtask_id;
        } else if (nextSubtask === 'AccountDuplicationCheck') {
          print.info('Performing account duplication check')
          taskInputs = { flow_token: flowToken, ...CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask].input };
          taskResponse = await postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
          flowToken = taskResponse.data.flow_token;
          nextSubtask = taskResponse.data.subtasks[0].subtask_id;
          this.isLoggedIn = true;
        }
      }

      print.info("Getting Authentication Token...");
      const twitterAuthToken = taskResponse.headers.get('set-cookie')
        .find((x: string) => x.startsWith('auth_token='))
        .split('auth_token=')[1]
        .split(';')[0];
      print.info("Getting CSRF Token...");

      let csrfToken = taskResponse.headers
        .get('set-cookie')
        .find((x: string) => x.startsWith('ct0='))
        .split('ct0=')[1]
        .split(';')[0];

      this.setHeaders({ cookie: `${this.headers.cookie}; auth_token=${twitterAuthToken}; ct0=${csrfToken}`, 'X-Csrf-Token': csrfToken });
      print.success("Login Success!\n\n");
      // console.log(this.headers);
    } catch (error) {
      throw error;
    }

    this.isLoggedIn = true;
  }

  private setHeaders(h: Record<string, any>): void {
    this.headers = { ...this.headers, ...h }
  }

  private async getGuestToken(): Promise<string> {
    let scriptText = '';
    this.$('script').each((_: number, element: cheerio.Element) => {
      let text = this.$(element).html();
      if (text && text.includes('document.cookie')) {
        scriptText = text;
        return false; // Break the loop
      }
    });

    const stringWithGT: RegExpMatchArray | null = scriptText.match(/"gt=\d{19}/);
    if (stringWithGT && stringWithGT[0]) return stringWithGT[0].replace('"gt=', '');
    throw new Error('Failed to get guest token');
  }

  async fetchChatHistory(historyEndpointURL: string, accessToken: string, userAgent: TaskHeaders) {
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

  private async authenticatePeriscope(): Promise<{ endpoint: string; accessToken: string; }> {
    // Retrieve the authentication token from Periscope
    print.info("Retrieving Periscope auth token");
    const { token: periscopeAuthToken }: { token: string } = (await getRequest(CONSTANTS.PERISCOPE_AUTH_URL, this.headers)).data;

    // Retrieve the cookie from Periscope
    print.info('Retrieving Periscope cookie');


    const { cookie: periscopeCookie }: { cookie: string } = (
      await postRequest(CONSTANTS.PERISCOPE_LOGIN_URL, this.headers, {
        create_user: false,
        direct: true,
        jwt: periscopeAuthToken,
        vendor_id: 'm5-proxsee-login-a2011357b73e',
      })
    ).data;

    const { access_token: pAccessToken, endpoint: pEndpoint, signer_key: pSignerKey, room_id: pRoomId } = (await postRequest(CONSTANTS.ACCESS_CHAT_URL, this.headers, { chat_token: this.chatToken, cookie: periscopeCookie })).data;

    return { endpoint: pEndpoint + '/chatapi/v1/history', accessToken: pAccessToken }
  }

  async generateSubtitle() {
    print.info('Starting to generate subtitles');

    whisper([`--file '${path.join(this.storagePath, 'out/', this.spaceMetadata.title)}'`, '-osrt', '--model /home/david/Desktop/Coding/Projects/Web/spaces-dl/models/ggml-base.en.bin']);


    // Note: Do not remove
    // const { endpoint, accessToken } = await this.authenticatePeriscope();
    // Fetch Chat History
    // this.chatHistory = await this.downloadChatHistory(endpoint, accessToken);
    // whisper();
    // console.log(this.chatHistory);
    // const speeches = this.chatHistory.playload
    // Parse History
    // Generate subtitle
  }

  private async downloadSegments(
    chunks: string[],
    retryCount: Record<string, number> = {},
    maxRetries: number = 10
  ): Promise<void> {

    // Check cache for the downloaded chunks

    for (let url of chunks) {
      const urlPath = path.basename(url);
      const chunkStorageLocation: string = path.join('chunks', urlPath);
      if (!retryCount[urlPath]) retryCount[urlPath] = 0;
      if (await fs.pathExists(path.resolve(this.storagePath + "/" + chunkStorageLocation))) {
        this.downloadChunksCount++;
        print.info(`${urlPath} already downloaded! Skipped!`);
        // break;
      } else {
        try {
          const response = Buffer.from((await axios.get(url, { responseType: 'arraybuffer' })).data);
          this.downloadChunksCount++;
          console.log(`Downloaded ${urlPath} ........................................ ${((this.downloadChunksCount / this.chunksUrls.length) * 100).toFixed(2)}% done`);
          await this.saveToDisk(response, chunkStorageLocation);
          // return response;
        } catch (error: any) {
          if (retryCount[urlPath] >= maxRetries) {
            throw new Error(`\nFailed to fetch chunk: ${urlPath}. Giving up after ${maxRetries} retries. \n${error.message}`);
          }

          retryCount[urlPath] += 1;
          console.error(`Failed to fetch ${urlPath} .................................. Retrying [${retryCount[urlPath]}/${maxRetries}]`);
          return this.downloadSegments([url], retryCount, maxRetries);
        }
      }
    }
  }


  private async convertSegmentsToWav() {
    await fs.ensureDir(path.join(this.storagePath, 'out/'));
    const passThroughStream = new PassThrough();
    const finalOutputFilePath = path.join(this.storagePath, 'out/', `${this.spaceMetadata.title}.wav`);
    // const ffmpegCommand = ffmpeg();
    const chunks: string[] = await fs.readdir(path.join(this.storagePath, 'chunks'), { encoding: "utf-8" });
    if (chunks.length === 0) {
      throw new Error('Failed to fetch chunks saved on disk.');
    }
    for (const chunkPath of chunks) {
      passThroughStream.write(await fs.readFile(path.join(this.storagePath, 'chunks/', chunkPath)));
      // ffmpegCommand.input(path.join(this.storagePath, 'chunks/', chunkPath))
    };
    passThroughStream.end();


    // Convert .aac to .wav
    // Taken from https://github.com/ggerganov/whisper.cpp#:~:text=ffmpeg%20%2Di%20input.mp3%20%2Dar%2016000%20%2Dac%201%20%2Dc%3Aa%20pcm_s16le%20output.wav

    await new Promise<void>((resolve, reject) => {
      ffmpeg(passThroughStream)
        .inputFormat('aac')
        .audioFrequency(16000) // Set sample rate to 16 kHz
        .audioChannels(1)      // Set audio channels to mono
        .audioCodec('pcm_s16le') // Set audio codec to pcm_s16le
        .toFormat('wav')        // Set output format to wav
        .on('error', (err) => {
          reject(`Error ${err.message}`);
        })
        .on('end', () => {
          resolve();
          console.log('Conversion to output.wav completed.');
        })
        .save(finalOutputFilePath);
    })
  }

  async generateAudio() {
    this.playlist = await this.getPlaylist();
    this.chunksUrls = this.parsePlaylist();
    await this.downloadSegments(this.chunksUrls);
    await this.convertSegmentsToWav();
  }

  async generateVideo() {

  }


  async cleanup() {
    print.info("Cleaning up!");
    print.success("Done!");
  }

}