import * as CONSTANTS from './constants/constants.js';
import cheerio from 'cheerio';
// import m3u8Parser from 'm3u8-parser';
import { getRequest, postRequest, print } from './utils/utils.js';
export class Downloader {
    username;
    password;
    headers;
    spaceMetadata;
    id;
    isLoggedIn = false;
    $;
    constructor(options) {
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
        print.info("Starting authentication flow");
        await this.login();
        print.info(`Retrieving space metadata: [${this.id}]`);
        await this.setSpaceMetadata();
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
            print.info('Logging in with credentials. Make sure 2FA is disabled on your account');
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
                if (Object.keys(CONSTANTS.LOGIN_FLOW_SUBTASK_DATA).find(x => x === nextSubtask)) {
                    print.info(`Performing next subtask: ${nextSubtask}`);
                }
                else {
                    throw new Error("Failed to get next subtask");
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
            this.setHeaders({ cookie: `${this.headers.cookie}; auth_token=${twitterAuthToken}; ct0=${csrfToken}`, 'X-Csrf-Token': csrfToken });
            print.success("Login Success!\n\n");
            // console.log(this.headers);
        }
        catch (error) {
            throw error;
        }
        this.isLoggedIn = true;
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
    async setSpaceMetadata() {
        const variables = CONSTANTS.VARIABLES(this.id);
        const features = CONSTANTS.FEATURES;
        const { data } = (await getRequest(CONSTANTS.SPACE_METADATA_URL(variables, features), this.headers)).data;
        this.spaceMetadata = data.audioSpace.metadata;
    }
    async fetchChatHistory(historyEndpointURL, accessToken, userAgent) {
        let chatHistory = [];
        let previousCursor = '';
        let index = 0;
        while (true) {
            try {
                await new Promise((resolve) => setTimeout(resolve, 300));
                const response = (await postRequest(historyEndpointURL, userAgent, {
                    cursor: previousCursor,
                    access_token: accessToken,
                    limit: 1000,
                    quick_get: true,
                    since: null,
                })).data;
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
            }
            catch (error) {
                throw new Error('Something went wrong! ' + error);
            }
        }
        return chatHistory;
    }
    async generateSubtitle(history) {
        // Helper function to convert a timestamp to SRT time format
        const formatTime = (milliseconds, wordCount) => {
            const date = new Date(milliseconds);
            if (wordCount)
                date.setSeconds(date.getSeconds() - wordCount);
            let hours = String(date.getUTCHours()).padStart(2, '0');
            let minutes = String(date.getUTCMinutes()).padStart(2, '0');
            let seconds = String(date.getUTCSeconds()).padStart(2, '0');
            let millis = String(date.getUTCMilliseconds()).padStart(3, '0');
            return `${hours}:${minutes}:${seconds},${millis}`;
        };
        // Destructure start and end times from spaceData
        let { started_at: startTime, ended_at: endTime } = spaceData.audioSpace.metadata;
        // Filter for spoken segments
        let subtitles = history.filter((x) => x.type === 45);
        // Map subtitles to include text and formatted times
        subtitles = subtitles.map((x, i) => {
            let startTimestamp = Number(x.programDateTime) - Number(startTime);
            let endTimestamp = (subtitles[i + 1] ? Number(subtitles[i + 1].timestamp) : Number(endTime)) - Number(startTime);
            x.body = `[@${x.username}]\n${x.body}`;
            return {
                text: x.body,
                from: formatTime(startTimestamp, 8),
                to: formatTime(endTimestamp),
            };
        });
        // Generate SRT content
        let srtContent = subtitles.map((subtitle, index) => `${index + 1}\n${subtitle.from} --> ${subtitle.to}\n${subtitle.text}\n`).join('\n');
        console.log(srtContent);
        // Optional: Write the content to a file (uncomment if needed)
        const fs = require('fs');
        fs.writeFileSync('subtitles.srt', srtContent);
    }
    async generateAudio() {
    }
    async generateVideo() {
    }
    async generateTranscription() {
    }
    async cleanup() {
        print.info("Cleaning up!");
        print.success("Done!");
    }
}
