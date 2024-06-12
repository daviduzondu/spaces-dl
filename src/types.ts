export interface DownloaderOptions {
    username: string,
    password: string,
    audio?: boolean,
    video?: boolean,
    id: string,
    output?: string
    transcribe?: string
    language?: string
    whisperPath?: string
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
