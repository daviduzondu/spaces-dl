export const URL_FLOW_1 = 'https://x.com/i/api/1.1/onboarding/task.json?flow_name=login';
export const URL_FLOW_2 = 'https://x.com/i/api/1.1/onboarding/task.json';
export const PERISCOPE_AUTH_URL = 'https://x.com/i/api/1.1/oauth/authenticate_periscope.json';
export const PERISCOPE_LOGIN_URL = 'https://proxsee.pscp.tv/api/v2/loginTwitterToken';
export const ACCESS_CHAT_URL = 'https://proxsee.pscp.tv/api/v2/accessChat';
export const URL_BASE = 'https://twitter.com/?mx=1';
export const CHECK_USER_URL = 'https://x.com/i/api/1.1/account/multi/list.json';
export const SPACE_METADATA_URL = (variables, features) => {
    return `https://x.com/i/api/graphql/SL4eyLXdr1zWZVpXRhxZ4Q/AudioSpaceById?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
};
export const PLAYLIST_INFO_URL = (mediaKey) => (`https://x.com/i/api/1.1/live_video_stream/status/${mediaKey}`);
export const BEARER = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
export const LOGIN_FLOW_SUBTASK_DATA = {
    '': { input: {} },
    'LoginJsInstrumentationSubtask': {
        input: {
            subtask_inputs: [
                {
                    subtask_id: 'LoginJsInstrumentationSubtask',
                    js_instrumentation: { response: '{}', link: 'next_link' },
                },
            ],
        }
    },
    'LoginEnterUserIdentifierSSO': (username) => ({
        input: {
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
            ]
        }
    }),
    'LoginEnterPassword': (password) => ({
        input: {
            subtask_inputs: [
                {
                    subtask_id: 'LoginEnterPassword',
                    enter_password: { password: password, link: 'next_link' },
                },
            ],
        }
    }),
    "AccountDuplicationCheck": {
        input: {
            subtask_inputs: [
                {
                    subtask_id: 'AccountDuplicationCheck',
                    check_logged_in_account: { link: 'AccountDuplicationCheck_false' },
                },
            ],
        }
    }
};
export const VARIABLES = (id) => ({ id, isMetatagsQuery: true, withReplays: true, withListeners: true });
export const FEATURES = {
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
export const BROWSER_LIST = ['google-chrome', 'firefox'];
