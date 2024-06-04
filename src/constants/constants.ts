import { Variables } from "../types.js";

export const URL_FLOW_1: string = 'https://x.com/i/api/1.1/onboarding/task.json?flow_name=login';
export const URL_FLOW_2: string = 'https://x.com/i/api/1.1/onboarding/task.json';
export const PERISCOPE_AUTH_URL: string = 'https://x.com/i/api/1.1/onboarding/task.json';
export const PERISCOPE_LOGIN_URL: string = 'https://proxsee.pscp.tv/api/v2/loginTwitterToken';
export const ACCESS_CHAT_URL: string = 'https://proxsee.pscp.tv/api/v2/accessChat';
export const URL_BASE: string = 'https://twitter.com/?mx=1';
export const SPACE_METADATA_URL = (variables: any, features: any): string => {
    return `https://x.com/i/api/graphql/SL4eyLXdr1zWZVpXRhxZ4Q/AudioSpaceById?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
};
export const PLAYLIST_INFO_URL = (mediaKey: string): string => (`https://x.com/i/api/1.1/live_video_stream/status/${mediaKey}`)

export const BEARER: string = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';


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

    'LoginEnterUserIdentifierSSO': (username: string) => ({
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
    'LoginEnterPassword': (password: string) => ({
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
}

export const VARIABLES = (id: string): Variables => ({ id, isMetatagsQuery: true, withReplays: true, withListeners: true })

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

export const LANGUAGES = {
    en: 'english',
    zh: 'chinese',
    de: 'german',
    es: 'spanish',
    ru: 'russian',
    ko: 'korean',
    fr: 'french',
    ja: 'japanese',
    pt: 'portuguese',
    tr: 'turkish',
    pl: 'polish',
    ca: 'catalan',
    nl: 'dutch',
    ar: 'arabic',
    sv: 'swedish',
    it: 'italian',
    id: 'indonesian',
    hi: 'hindi',
    fi: 'finnish',
    vi: 'vietnamese',
    he: 'hebrew',
    uk: 'ukrainian',
    el: 'greek',
    ms: 'malay',
    cs: 'czech',
    ro: 'romanian',
    da: 'danish',
    hu: 'hungarian',
    ta: 'tamil',
    no: 'norwegian',
    th: 'thai',
    ur: 'urdu',
    hr: 'croatian',
    bg: 'bulgarian',
    lt: 'lithuanian',
    la: 'latin',
    mi: 'maori',
    ml: 'malayalam',
    cy: 'welsh',
    sk: 'slovak',
    te: 'telugu',
    fa: 'persian',
    lv: 'latvian',
    bn: 'bengali',
    sr: 'serbian',
    az: 'azerbaijani',
    sl: 'slovenian',
    kn: 'kannada',
    et: 'estonian',
    mk: 'macedonian',
    br: 'breton',
    eu: 'basque',
    is: 'icelandic',
    hy: 'armenian',
    ne: 'nepali',
    mn: 'mongolian',
    bs: 'bosnian',
    kk: 'kazakh',
    sq: 'albanian',
    sw: 'swahili',
    gl: 'galician',
    mr: 'marathi',
    pa: 'punjabi',
    si: 'sinhala',
    km: 'khmer',
    sn: 'shona',
    yo: 'yoruba',
    so: 'somali',
    af: 'afrikaans',
    oc: 'occitan',
    ka: 'georgian',
    be: 'belarusian',
    tg: 'tajik',
    sd: 'sindhi',
    gu: 'gujarati',
    am: 'amharic',
    yi: 'yiddish',
    lo: 'lao',
    uz: 'uzbek',
    fo: 'faroese',
    ht: 'haitian creole',
    ps: 'pashto',
    tk: 'turkmen',
    nn: 'nynorsk',
    mt: 'maltese',
    sa: 'sanskrit',
    lb: 'luxembourgish',
    my: 'myanmar',
    bo: 'tibetan',
    tl: 'tagalog',
    mg: 'malagasy',
    as: 'assamese',
    tt: 'tatar',
    haw: 'hawaiian',
    ln: 'lingala',
    ha: 'hausa',
    ba: 'bashkir',
    jw: 'javanese',
    su: 'sundanese',
    yue: 'cantonese',
};