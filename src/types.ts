export interface DownloaderOptions {
    username: string,
    password: string,
    id: string,
    output: string
    browserLogin?: boolean,
    disableBrowserLogin?: boolean
    m3u8?: string,
}

export interface TaskHeaders {
    [key: string]: string,
}

export interface Variables {
    id: string;
    isMetatagsQuery: boolean;
    withReplays: boolean;
    withListeners: boolean;
}

export interface Message {
    kind: number;
    payload: any;
    signature: string;
}

export interface ChatMessage {
    messages: Message[];
    cursor: string;
}


export type MessageType = 'info' | 'warning' | 'success' | 'error';
