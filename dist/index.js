import * as CONSTANTS from './constants/constants.js';
import axios from 'axios';
import cheerio from 'cheerio';
import os from 'os';
// @ts-ignore
import m3u8Parser from 'm3u8-parser';
import { PassThrough } from 'stream';
import { getRequest, postRequest, print } from './utils/utils.js';
import fs from 'fs-extra';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import puppeteer from 'puppeteer-core';
export class Downloader {
    username;
    password;
    options;
    headers;
    audioSpaceData;
    mediaKey;
    id;
    isLoggedIn = false;
    $;
    playlist;
    playlistUrl;
    chunkBaseUrl;
    downloadChunksCount = 0;
    storagePath;
    chunksUrls;
    output;
    mp3OutputFilePath;
    constructor(options) {
        this.options = options;
        this.username = options.username;
        this.password = options.password;
        this.id = options.id;
        this.output = options.output.replace('~/', `/${os.homedir()}/`);
        this.storagePath = path.join(this.output, `/task-${this.id}/`);
        console.log('Writing to ', this.storagePath);
        this.headers = {
            'User-Agent': 'curl/7.81.0',
            'accept': "*/*",
            Referer: 'https://twitter.com/',
            'Content-Type': 'application/json',
        };
    }
    async init() {
        print.info("Starting authentication flow");
        // await this.loginWithPuppeteer();
        await this.login();
        await this.checkUser();
        print.info(`Retrieving space metadata: [${this.id}]`);
        await this.setSpaceMetadataAndMediaKey();
        const playListInfoResponse = await getRequest(CONSTANTS.PLAYLIST_INFO_URL(this.mediaKey), this.headers);
        this.playlistUrl = playListInfoResponse.data.source.location;
        this.chunkBaseUrl = this.playlistUrl.replace(path.basename(this.playlistUrl), '');
        return this;
    }
    async login() {
        try {
            const response = await getRequest(CONSTANTS.URL_BASE, this.headers);
            this.$ = cheerio.load(response.data);
            print.info("Retrieving guest token...");
            this.headers['X-Guest-Token'] = await this.getGuestToken();
            this.headers["Authorization"] = CONSTANTS.BEARER;
            // Initialize login flow:
            let taskResponse;
            let taskInputs = CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[''].input;
            taskResponse = (await postRequest(CONSTANTS.URL_FLOW_1, this.headers, JSON.stringify(taskInputs)));
            let flowToken = taskResponse.data.flow_token;
            // console.log(taskResponse.data)
            let nextSubtask = taskResponse.data.subtasks[0].subtask_id;
            const att = taskResponse.headers
                .get('set-cookie')
                .find((x) => x.startsWith('att='))
                .split('att=')[1]
                .split(';')[0];
            this.setHeaders({ cookie: `att=${att}` });
            while (!this.isLoggedIn) {
                if (this.options.browserLogin) {
                    await this.loginWithPuppeteer();
                    return;
                }
                else {
                    print.info('Attempting to login with username and password. Make sure 2FA is disabled on your account');
                }
                if (Object.keys(CONSTANTS.LOGIN_FLOW_SUBTASK_DATA).find(x => x === nextSubtask) && !this.options.browserLogin) {
                    print.info(`Performing next subtask: ${nextSubtask}`);
                }
                else {
                    print.error(`Subtask ${nextSubtask} not recognized.`);
                    if (!this.options.disableBrowserLogin) {
                        await this.loginWithPuppeteer();
                        return;
                    }
                }
                if (nextSubtask === 'LoginJsInstrumentationSubtask') {
                    taskInputs = { flow_token: flowToken, ...CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask].input };
                    taskResponse = await postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
                    flowToken = taskResponse.data.flow_token;
                    nextSubtask = taskResponse.data.subtasks[0].subtask_id;
                }
                else if (nextSubtask === 'LoginEnterUserIdentifierSSO') {
                    print.default('Submitting username...');
                    taskInputs = { flow_token: flowToken, ...CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask](this.username).input };
                    taskResponse = await postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
                    flowToken = taskResponse.data.flow_token;
                    // console.log(taskResponse.data)
                    nextSubtask = taskResponse.data.subtasks[0].subtask_id;
                }
                else if (nextSubtask === 'LoginEnterPassword') {
                    print.default('Submitting password...');
                    taskInputs = { flow_token: flowToken, ...CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask](this.password).input };
                    taskResponse = await postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
                    flowToken = taskResponse.data.flow_token;
                    nextSubtask = taskResponse.data.subtasks[0].subtask_id;
                }
                else if (nextSubtask === 'AccountDuplicationCheck') {
                    print.info('Performing account duplication check');
                    taskInputs = { flow_token: flowToken, ...CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask].input };
                    taskResponse = await postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
                    flowToken = taskResponse.data.flow_token;
                    nextSubtask = taskResponse.data.subtasks[0].subtask_id;
                    this.isLoggedIn = true;
                }
            }
            print.info("Getting Authentication Token...");
            const twitterAuthToken = taskResponse.headers.get('set-cookie')
                .find((x) => x.startsWith('auth_token='))
                .split('auth_token=')[1]
                .split(';')[0];
            print.info("Getting CSRF Token...");
            let csrfToken = taskResponse.headers
                .get('set-cookie')
                .find((x) => x.startsWith('ct0='))
                .split('ct0=')[1]
                .split(';')[0];
            this.setHeaders({ cookie: `auth_token=${twitterAuthToken}; ct0=${csrfToken}`, 'X-Csrf-Token': csrfToken });
            print.success("Login Success!");
        }
        catch (error) {
            throw error;
        }
        this.isLoggedIn = true;
    }
    async checkUser() {
        // Ensures that the user is not suspended. Suspended users cannot access Twitter spaces;
        const response = (await getRequest(CONSTANTS.CHECK_USER_URL, this.headers)).data;
        const { is_suspended } = response.users[0];
        if (is_suspended)
            throw new Error(`@${this.options.username} is currently suspended`);
    }
    async loginWithPuppeteer() {
        print.info(`Attempting to login with browser. Enter in your login details when browser launches`);
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: '/usr/bin/google-chrome',
            args: ["--disable-infobars"]
        });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(0);
        // Navigate to the login page
        await page.goto('https://x.com/i/flow/login');
        // Wait until the page navigates to x.com/home
        await Promise.race([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            new Promise((resolve) => {
                const checkUrlInterval = setInterval(() => {
                    if (page.url().startsWith('https://x.com/home')) {
                        clearInterval(checkUrlInterval);
                        resolve(); // Resolve the promise when condition is met
                    }
                }, 1000); // Check every second
            })
        ]);
        // Now we are on x.com/home
        const cookies = await page.cookies();
        // Extract specific cookie values if needed
        const cookie = '';
        const auth_token = cookies.find(cookie => cookie.name === 'auth_token').value;
        const csrfToken = cookies.find(cookie => cookie.name === 'ct0').value;
        // Assuming `this.setHeaders` and `print.success` are custom functions or part of your application
        this.setHeaders({
            cookie: `auth_token=${auth_token}; ct0=${csrfToken}`,
            'X-Csrf-Token': csrfToken
        });
        print.success("Login Success!");
        // Close the browser after everything is done
        await browser.close();
    }
    setHeaders(h) {
        this.headers = { ...this.headers, ...h };
    }
    async getGuestToken() {
        let scriptText = '';
        this.$('script').each((_, element) => {
            let text = this.$(element).html();
            if (text && text.includes('document.cookie')) {
                scriptText = text;
                return false; // Break the loop
            }
        });
        const stringWithGT = scriptText.match(/"gt=\d{19}/);
        if (stringWithGT && stringWithGT[0])
            return stringWithGT[0].replace('"gt=', '');
        throw new Error('Failed to get guest token');
    }
    async setSpaceMetadataAndMediaKey() {
        const variables = CONSTANTS.VARIABLES(this.id);
        const features = CONSTANTS.FEATURES;
        const { data } = (await getRequest(CONSTANTS.SPACE_METADATA_URL(variables, features), this.headers)).data;
        this.audioSpaceData = data.audioSpace;
        print.info('Retrieving media key...');
        this.mediaKey = this.audioSpaceData.metadata.media_key;
    }
    async getPlaylist() {
        let playlistPath = path.join(this.storagePath + "/" + "playlist.m3u8");
        let playlist;
        if (await fs.pathExists(playlistPath)) {
            print.info('Playlist already downloaded!');
            return await fs.readFile(playlistPath, { encoding: "utf-8" });
            // return;
        }
        print.info('Downloading playlist');
        console.log(this.playlistUrl);
        playlist = (await getRequest(this.playlistUrl, this.headers)).data;
        await this.saveToDisk(playlist, `playlist.m3u8`);
        return playlist;
    }
    parsePlaylist() {
        const parser = new m3u8Parser.Parser();
        parser.push(this.playlist);
        parser.end();
        return parser.manifest.segments.map((x) => this.chunkBaseUrl + x.uri);
    }
    async saveToDisk(data, location) {
        await fs.outputFile(path.join(this.storagePath + '/' + location), data);
    }
    async downloadSegments(chunks, retryCount = {}, maxRetries = 10) {
        // Check cache for the downloaded chunks
        print.info('Starting to download audio chunks');
        for (let url of chunks) {
            let message = `Starting to download chunks`;
            const chunkName = path.basename(url);
            const chunkStorageLocation = path.join('chunks', chunkName);
            if (!retryCount[chunkName])
                retryCount[chunkName] = 0;
            if (await fs.pathExists(path.resolve(this.storagePath + "/" + chunkStorageLocation))) {
                this.downloadChunksCount++;
                message = `Skipping ${chunkName}`;
                // print.info(`${urlPath} already downloaded! Skipped!`);
                // break;
            }
            else {
                try {
                    message = `Downloading ${chunkName}`;
                    const response = Buffer.from((await axios.get(url, { responseType: 'arraybuffer' })).data);
                    this.downloadChunksCount++;
                    // console.log(`Downloaded ${urlPath} ........................................ ${((this.downloadChunksCount / this.chunksUrls.length) * 100).toFixed(2)}% done`);
                    await this.saveToDisk(response, chunkStorageLocation);
                    // return response;
                }
                catch (error) {
                    if (retryCount[chunkName] >= maxRetries) {
                        throw new Error(`\nFailed to fetch chunk: ${chunkName}. Giving up after ${maxRetries} retries. \n${error.message}`);
                    }
                    retryCount[chunkName] += 1;
                    console.error(`Failed to fetch ${chunkName} .................................. Retrying [${retryCount[chunkName]}/${maxRetries}]`);
                    return this.downloadSegments([url], retryCount, maxRetries);
                }
            }
            print.progress(this.downloadChunksCount, this.chunksUrls.length, message, "AUDIO");
        }
    }
    async convertSegmentsToMp3() {
        await fs.ensureDir(path.join(this.storagePath, 'out/'));
        const passThroughStream = new PassThrough();
        this.mp3OutputFilePath = path.join(this.storagePath, 'out/', `${this.audioSpaceData.metadata.title}.mp3`);
        // const ffmpegCommand = ffmpeg();
        const chunks = await fs.readdir(path.join(this.storagePath, 'chunks'), { encoding: "utf-8" });
        if (chunks.length === 0) {
            throw new Error('Failed to fetch chunks saved on disk.');
        }
        for (const chunkPath of chunks) {
            passThroughStream.write(await fs.readFile(path.join(this.storagePath, 'chunks/', chunkPath)));
            // ffmpegCommand.input(path.join(this.storagePath, 'chunks/', chunkPath))
        }
        ;
        passThroughStream.end();
        await new Promise((resolve, reject) => {
            ffmpeg(passThroughStream)
                .inputFormat('aac')
                .audioFrequency(44100) // Set sample rate to 44.1 kHz for better quality
                .audioChannels(2) // Set audio channels to stereo
                .audioCodec('libmp3lame') // Set audio codec to libmp3lame for MP3 encoding
                .toFormat('mp3') // Set output format to mp3
                .on('error', (err) => {
                reject(`Error: ${err.message}`);
            })
                .on('progress', (progress) => {
                const duration = new Date(Number(this.audioSpaceData.metadata.ended_at) - this.audioSpaceData.metadata.started_at).getTime();
                const datedTimeStamp = new Date(`1970-01-01T${progress.timemark}Z`).getTime();
                print.progress(datedTimeStamp, duration, "Combining chunks and converting to .mp3", "FFMPEG");
            })
                .on('end', () => {
                resolve();
                print.success('Merging completed');
            })
                .save(this.mp3OutputFilePath);
        });
    }
    async generateAudio() {
        this.playlist = await this.getPlaylist();
        this.chunksUrls = this.parsePlaylist();
        await this.downloadSegments(this.chunksUrls);
        await this.convertSegmentsToMp3();
    }
    async cleanup() {
        const finalFilePath = path.resolve(this.mp3OutputFilePath, '../../..', path.basename(this.mp3OutputFilePath));
        // con
        await fs.move(this.mp3OutputFilePath, finalFilePath);
        // await fs.rm(this.storagePath, { recursive: true, force: true });
        print.info("Cleaning up!");
        print.success("Done!");
    }
}
