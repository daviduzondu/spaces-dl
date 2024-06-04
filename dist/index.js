var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as CONSTANTS from './constants/constants.js';
import cheerio from 'cheerio';
// import m3u8Parser from 'm3u8-parser';
import { getRequest, postRequest, print } from './utils/utils.js';
export class Downloader {
    constructor(options) {
        this.isLoggedIn = false;
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
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            print.info("Starting authentication flow");
            yield this.login();
        });
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield getRequest(CONSTANTS.URL_BASE, this.headers);
                this.$ = cheerio.load(response.data);
                print.info("Retrieving guest token...");
                this.headers['X-Guest-Token'] = yield this.getGuestToken();
                this.headers["Authorization"] = CONSTANTS.BEARER;
                // Initialize login flow:
                print.info('Logging in with credentials. Make sure 2FA is disabled on your account');
                let taskResponse;
                let taskInputs = CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[''].input;
                taskResponse = (yield postRequest(CONSTANTS.URL_FLOW_1, this.headers, JSON.stringify(taskInputs)));
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
                        taskInputs = Object.assign({ flow_token: flowToken }, CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask].input);
                        taskResponse = yield postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
                        flowToken = taskResponse.data.flow_token;
                        nextSubtask = taskResponse.data.subtasks[0].subtask_id;
                    }
                    else if (nextSubtask === 'LoginEnterUserIdentifierSSO') {
                        print.default('Submitting username...');
                        taskInputs = Object.assign({ flow_token: flowToken }, CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask](this.username).input);
                        taskResponse = yield postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
                        flowToken = taskResponse.data.flow_token;
                        // console.log(taskResponse.data)
                        nextSubtask = taskResponse.data.subtasks[0].subtask_id;
                    }
                    else if (nextSubtask === 'LoginEnterPassword') {
                        print.default('Submitting password...');
                        taskInputs = Object.assign({ flow_token: flowToken }, CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask](this.password).input);
                        taskResponse = yield postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
                        flowToken = taskResponse.data.flow_token;
                        nextSubtask = taskResponse.data.subtasks[0].subtask_id;
                    }
                    else if (nextSubtask === 'AccountDuplicationCheck') {
                        print.info('Performing account duplication check');
                        taskInputs = Object.assign({ flow_token: flowToken }, CONSTANTS.LOGIN_FLOW_SUBTASK_DATA[nextSubtask].input);
                        taskResponse = yield postRequest(CONSTANTS.URL_FLOW_2, this.headers, JSON.stringify(taskInputs));
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
                console.log(this.headers);
            }
            catch (error) {
                throw error;
            }
            this.isLoggedIn = true;
        });
    }
    setHeaders(h) {
        this.headers = Object.assign(Object.assign({}, this.headers), h);
    }
    getGuestToken() {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    fetchChatHistory(historyEndpointURL, accessToken, userAgent) {
        return __awaiter(this, void 0, void 0, function* () {
            let chatHistory = [];
            let previousCursor = '';
            let index = 0;
            while (true) {
                try {
                    yield new Promise((resolve) => setTimeout(resolve, 300));
                    const response = (yield postRequest(historyEndpointURL, userAgent, {
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
        });
    }
    generateSubtitle(history) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
}
