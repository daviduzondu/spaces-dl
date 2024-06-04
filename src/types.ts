export interface DownloaderOptions {
    username: string,
    password: string,
    id: string,
    output?: string
    transcribe?: string
    language?: string
    whisperPath?: string
}

export interface TaskHeaders {
    [key: string]: string,
}

export type MessageType = 'info' | 'warning' | 'success' | 'error';
