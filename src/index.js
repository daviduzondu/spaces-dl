// import axios from 'axios';

const path = require('path');
// import cheerio from 'cheerio';
const axios = require('axios');
const cheerio = require('cheerio');
const m3u8Parser = require('m3u8-parser');


const { combineAndWriteToDisk, convertBuffersToMP3 } = require('./utils/utils.js');

let downloadLength = 0;
let downloadedSegments = [];
let userAgent = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0',
  Referer: 'https://x.com/sw.js',
};
let spaceData;
let urlFlow1 = 'https://x.com/i/api/1.1/onboarding/task.json?flow_name=login';
let urlFlow2 = 'https://x.com/i/api/1.1/onboarding/task.json';
// const authorizePeriscopeTokenURL = 'https://proxsee.pscp.tv/api/v2/authorizeToken';
const authenticatePeriscopeURL = 'https://x.com/i/api/1.1/oauth/authenticate_periscope.json'; // --> token
const periscopeLoginTwitterURL = 'https://proxsee.pscp.tv/api/v2/loginTwitterToken'; // --> cookie || <-- jwt:token
const accessChatURL = 'https://proxsee.pscp.tv/api/v2/accessChat'; // <-- chat_token, cookie || --> access_token, access_token, auth_token, chan_perms, channel, endpoint, participant_index, publisher, read_only, true, replay_access_token, replay_endpoint, room_id, should_log,should_verify_signature, signer_key, signer_token, subscriber

// --video Renders a video instead of just audio. You will be able to see profile pictures of participants in the space, see who is speaking and more.
// --subtitles This downloads the subtitles of the space if it is available

// Captions bring Spaces captions to the video

async function fetchChatHistory(historyEndpointURL, accessToken, userAgent) {
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

async function generateSubtitle(history) {
  // Helper function to convert a timestamp to SRT time format
  const formatTime = (milliseconds, wordCount) => {
    const date = new Date(milliseconds);
    if (wordCount) date.setSeconds(date.getSeconds() - wordCount);
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

async function fetchSegments(segmentUrls, retryCount = {}, maxRetries = 10) {
  if (downloadLength === 0) downloadLength = segmentUrls.length;

  const segments = segmentUrls.map(async (url) => {
    const urlPath = path.basename(url);
    if (!retryCount[urlPath]) retryCount[urlPath] = 0;

    try {
      const response = Buffer.from((await axios.get(url, { responseType: 'arraybuffer' })).data);

      downloadedSegments.push(response);
      console.log(`Downloaded ${urlPath} ........................................ ${((downloadedSegments.length / downloadLength) * 100).toFixed(2)}% done`);
      return response;
    } catch (error) {
      if (retryCount[urlPath] >= maxRetries) {
        throw new Error(`\nFailed to fetch chunk: ${urlPath}. Giving up after ${maxRetries} retries. \n${error.message}`);
      }

      retryCount[urlPath] += 1;
      console.error(`Failed to fetch ${urlPath} .................................. Retrying [${retryCount[urlPath]}/${maxRetries}]`);
      return fetchSegments([url], retryCount, maxRetries);
    }
  });

  return (await Promise.all(segments)).flat();
}

// Function to get file
async function fetchAndParseM3U8(playlistURL, chunkBaseURL, headers) {
  try {
    const response = await axios({
      method: 'get',
      url: playlistURL,
      responseType: 'stream',
    });

    if (response.status !== 200) {
      throw new Error(`Failed to get file: ${response.status}`);
    }

    let m3u8Info = '';

    return new Promise((resolve, reject) => {
      response.data.setEncoding('utf8');

      response.data.on('data', (chunk) => {
        m3u8Info += chunk;
      });

      response.data.on('end', async () => {
        try {
          const parser = new m3u8Parser.Parser();
          parser.push(m3u8Info);
          parser.end();
          const segmentUrls = parser.manifest.segments.map((x) => chunkBaseURL + x.uri);
          console.log(parser.manifest);
          console.log('Downloaded Segment');
          resolve(segmentUrls);
        } catch (error) {
          reject(error);
        }
      });

      response.data.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Fetch error:', error.message);
    throw error;
  }
}

// Function to perform GET request with specified headers
async function getRequest(url, headers) {
  try {
    const response = await axios.get(url, {
      headers,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      validateStatus: function (status) {
        return status < 500; // Reject only if the status code is 500 or greater
      },
    });
    // console.log(response.data)
    return response;
  } catch (error) {
    // console.error(error);
    throw new Error(error);
  }
}

// Function to perform POST request with specified headers and data
async function postRequest(url, headers, data) {
  try {
    const response = await axios.post(url, data, {
      headers,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      validateStatus: function (status) {
        return status < 500; // Reject only if the status code is 500 or greater
      },
    });
    return response;
  } catch (error) {
    throw new Error(error);
  }
}

// Initial GET request to obtain HTML content
async function main() {
  let url_base = 'https://twitter.com/?mx=1';
  let response = await getRequest(url_base, userAgent);
  let $ = cheerio.load(response.data);

  // Extract guest token
  let script_text = '';
  $('script').each(function () {
    let text = $(this).html();
    if (text && text.includes('document.cookie')) {
      script_text = text;
      return false; // Break the loop
    }
  });

  let guest_token = script_text.match(/"gt=\d{19}/)[0].replace('"gt=', '');
  console.log(`[*] Guest token: ${guest_token}`);

  // Get Bearer token
  let bearer = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

  console.log(`[*] Bearer: ${bearer}`);
  let authorization_bearer = `Bearer ${bearer}`;

  // Flow 1
  let data = {};
  userAgent = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0',
    Referer: 'https://x.com/sw.js',
    'X-Guest-Token': guest_token,
    'Content-Type': 'application/json',
    Authorization: authorization_bearer,
  };

  response = await postRequest(urlFlow1, userAgent, JSON.stringify(data));
  let flow_token = response.data.flow_token;
  console.log(`[*] flow_token: ${flow_token}`);

  // Flow 2
  data = {
    flow_token: flow_token,
    subtask_inputs: [
      {
        subtask_id: 'LoginJsInstrumentationSubtask',
        js_instrumentation: { response: '{}', link: 'next_link' },
      },
    ],
  };
  const att = response.headers
    .get('set-cookie')
    .find((x) => x.startsWith('att='))
    .split('att=')[1]
    .split(';')[0];
  userAgent = { ...userAgent, cookie: `att=${att}` };
  response = await postRequest(urlFlow2, userAgent, JSON.stringify(data));
  flow_token = response.data.flow_token;
  console.log(`[*] flow_token: ${flow_token}`);

  // Flow 3
  let username = 's';
  data = {
    flow_token: flow_token,
    subtask_inputs: [
      {
        subtask_id: 'LoginEnterUserIdentifierSSO',
        settings_list: {
          setting_responses: [
            {
              key: 'user_identifier',
              response_data: { text_data: { result: username } },
            },
          ],
          link: 'next_link',
        },
      },
    ],
  };
  // https://x.com/i/spaces/1OyKAWgagpqJb
  response = await postRequest(urlFlow2, userAgent, JSON.stringify(data));
  flow_token = response.data.flow_token;
  console.log(`[*] flow_token: ${flow_token}`);

  // Flow 4
  let password = '';
  data = {
    flow_token: flow_token,
    subtask_inputs: [
      {
        subtask_id: 'LoginEnterPassword',
        enter_password: { password: password, link: 'next_link' },
      },
    ],
  };

  response = await postRequest(urlFlow2, userAgent, JSON.stringify(data));
  flow_token = response.data.flow_token;
  let user_id = response.data.subtasks[0].check_logged_in_account.user_id;
  console.log(`[*] flow_token: ${flow_token}`);
  console.log(`[*] user_id: ${user_id}`);
  // resolve, reject;
  // Flow 5
  data = {
    flow_token: flow_token,
    subtask_inputs: [
      {
        subtask_id: 'AccountDuplicationCheck',
        check_logged_in_account: { link: 'AccountDuplicationCheck_false' },
      },
    ],
  };

  response = await postRequest(urlFlow2, userAgent, JSON.stringify(data));
  flow_token = response.data.flow_token;
  let twitterAuthToken = response.headers
    .get('set-cookie')
    .find((x) => x.startsWith('auth_token='))
    .split('auth_token=')[1]
    .split(';')[0];
  let csrf_token = response.headers
    .get('set-cookie')
    .find((x) => x.startsWith('ct0='))
    .split('ct0=')[1]
    .split(';')[0];
  console.log(`[*] flow_token: ${flow_token}`);
  userAgent = { ...userAgent, cookie: userAgent.cookie + '; ' + `auth_token=${twitterAuthToken}` + '; ' + `ct0=${csrf_token}`, 'X-Csrf-Token': csrf_token };

  // const variables = { id: '1jMKgmpgZZWJL', isMetatagsQuery: true, withReplays: true, withListeners: true };
  const variables = { id: '1jMJgmQnggPKL', isMetatagsQuery: true, withReplays: true, withListeners: true };
  const features = {
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
    spaces_2022_h2_clipping: false,
    spaces_2022_h2_spaces_communities: false,
  };
  console.log(`[*] retrieving space metadata`);
  response = await getRequest(
    `https://x.com/i/api/graphql/SL4eyLXdr1zWZVpXRhxZ4Q/AudioSpaceById?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`,
    userAgent
  );
  spaceData = response.data.data;
  console.log('[*] Space found! ' + spaceData.audioSpace.metadata.title);
  console.log('[*] Retrieving media key');
  response = await getRequest(`https://x.com/i/api/1.1/live_video_stream/status/${spaceData.audioSpace.metadata.media_key}`, userAgent);
  console.log(spaceData.audioSpace);
  console.log('[*] Retrieving m3u8 information');
  // let m3u8Info = '';
  const playlistURL = response.data.source.location;
  const chatToken = response.data.chatToken;
  const chunkBaseURL = response.data.source.location.split('/playlist')[0] + '/';
  const segmentsPromises = await fetchAndParseM3U8(playlistURL, chunkBaseURL, 'Fetching m3u8 file...', 'Parsing m3u8 file successful...');

  console.log('Playlist URL', playlistURL);
  const segments = await fetchSegments(segmentsPromises);
  const outputFilePath = `${spaceData.audioSpace.metadata.title}.mp3`; // Path to the output combined file

  console.log('[*] Attempting to download chat history');

  // Retrieve the auth token from Periscope
  const { token: periscopeAuthToken } = (await getRequest(authenticatePeriscopeURL, userAgent)).data;

  console.log('periscope auth:', periscopeAuthToken);

  const { cookie: periscopeCookie } = (
    await postRequest(periscopeLoginTwitterURL, userAgent, {
      create_user: false,
      direct: true,
      jwt: periscopeAuthToken,
      vendor_id: 'm5-proxsee-login-a2011357b73e',
    })
  ).data;

  const { access_token: pAccessToken, endpoint: pEndpoint, signer_key: pSignerKey, room_id: pRoomId } = (await postRequest(accessChatURL, userAgent, { chat_token: chatToken, cookie: periscopeCookie })).data;

  console.log('[*] Retrieving chat history');
  const chatHistory = (await fetchChatHistory(pEndpoint + '/chatapi/v1/history', pAccessToken)).map((x) => ({ ...JSON.parse(JSON.parse(x.payload).body) }));

  console.log(chatHistory);
  generateSubtitle(chatHistory);
  await convertBuffersToMP3(segments, outputFilePath, 'Bringing everything together', `Done! File written to ${outputFilePath}`);
  console.log(`Done! File written to ${outputFilePath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit();
  // throw e.message;
});
