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

export type MessageType = 'info' | 'warning' | 'success' | 'error';
