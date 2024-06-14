import * as CONSTANTS from './constants/constants.js';
import axios, { Axios, AxiosRequestHeaders, AxiosResponse } from 'axios';
import cheerio from 'cheerio';
import m3u8Parser from 'm3u8-parser';
import { PassThrough } from 'stream';
import { convertBuffersToMP3, getRequest, postRequest, print } from './utils/utils.js';
import { ChatMessage, DownloaderOptions, Message, TaskHeaders } from './types.js';
import fs from 'fs-extra';
import path from 'path';
import { whisper } from './lib/whisper.js';
import ffmpeg from 'fluent-ffmpeg';

interface DownloaderInterface {
  [key: string]: any
}

export class Downloader implements DownloaderInterface {
  private username: string;
  private password: string;
  private options!: DownloaderOptions;
  private headers: TaskHeaders;
  private spaceMetadata!: Record<string, any>;
  private mediaKey!: string;
  private m3u8: any;
  private id: string;
  private isLoggedIn: boolean = false;
  private $: any;
  private playlist!: string;
  private playlistUrl!: string;
  private chunkBaseUrl!: string;
  private playlistManifest!: Record<string, any>;
  private downloadChunksCount: number = 0;
  private storagePath;
  private chunksUrls!: string[];
  private chatToken!: string;
  private chatHistory: ChatMessage[] = [];
  private audioGenerated: Boolean = false;

  constructor(options: DownloaderOptions) {
    this.options = options;
    this.username = options.username;
    this.password = options.password;
    this.id = options.id;
    this.storagePath = path.resolve(`./task-${this.id}/`);

    this.headers = {
      'User-Agent': 'curl/7.81.0',
      'accept': "*/*",
      Referer: 'https://twitter.com/',
      'Content-Type': 'application/json',
    };

  }

  async init(): Promise<Downloader> {
    print.info("Starting authentication flow")
    await this.login();
    print.info(`Retrieving space metadata: [${this.id}]`);
    await this.setSpaceMetadataAndMediaKey();
    const playListInfoResponse: AxiosResponse = await getRequest(CONSTANTS.PLAYLIST_INFO_URL(this.mediaKey), this.headers);
    this.playlistUrl = playListInfoResponse.data.source.location;
    this.chatToken = playListInfoResponse.data.chatToken;
    this.chunkBaseUrl = this.playlistUrl.replace(path.basename(this.playlistUrl), '');
    return this;
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

  private async setSpaceMetadataAndMediaKey() {
    const variables = CONSTANTS.VARIABLES(this.id);
    const features = CONSTANTS.FEATURES;
    const { data } = (await getRequest(CONSTANTS.SPACE_METADATA_URL(variables, features), this.headers)).data;
    this.spaceMetadata = data.audioSpace.metadata;
    print.info('Retrieving media key...');
    this.mediaKey = this.spaceMetadata.media_key;
  }

  private async getPlaylist() {
    let playlistPath: string = path.join(this.storagePath + "/" + "playlist.m3u8");
    let playlist: string;

    if (await fs.pathExists(playlistPath)) {
      print.info('Playlist already downloaded!');
      return await fs.readFile(playlistPath, { encoding: "utf-8" });
      // return;
    }

    print.info('Downloading playlist');

    playlist = (await getRequest(this.playlistUrl, this.headers)).data;
    await this.saveToDisk(playlist, `playlist.m3u8`);
    return playlist;
  }

  private parsePlaylist(): string[] {
    const parser = new m3u8Parser.Parser();
    parser.push(this.playlist);
    parser.end();
    this.playlistManifest = parser.manifest;
    return parser.manifest.segments.map((x: { uri: string }) => this.chunkBaseUrl + x.uri);
  }

  private async saveToDisk(data: any, location: string) {
    await fs.outputFile(path.join(this.storagePath + '/' + location), data);
  }

  async generateSubtitle() {
    print.info('Starting to generate subtitles');
    whisper([`--file '${path.join(this.storagePath, 'out/', this.spaceMetadata.title)}.wav'`, '-osrt', '--model /home/david/Desktop/Coding/Projects/Web/spaces-dl/models/ggml-base.en.bin']);
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

  private async generateImage() {

  }

  async generateAudio() {
    this.playlist = await this.getPlaylist();
    this.chunksUrls = this.parsePlaylist();
    await this.downloadSegments(this.chunksUrls);
    await this.convertSegmentsToWav();
    this.audioGenerated = true;
  }

  async generateVideo() {
    print.info("Checking if audio has been extracted...");
    if (!this.audioGenerated) {
      print.info("Audio has not been extracted! Extracting audio before video generation...");
      this.generateAudio();
    };

    
  }




  async cleanup() {
    print.info("Cleaning up!");
    print.success("Done!");
  }
}