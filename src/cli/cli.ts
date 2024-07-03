#!/usr/bin/env node

import { Command } from 'commander';
import { Downloader } from '../index.js';
import { DownloaderOptions } from '../types.js';
import path from 'path';
import { print } from '../utils/utils.js';
import { BROWSER_LIST } from '../constants/constants.js';
const program = new Command();


program
    .name('spaces-dl')
    .description('CLI to download recorded Twitter Spaces')
    .version('1.0.0')
    .option('-m, --m3u8', 'm3u8 file url')
    .option('-i, --id <id>', 'A valid ID for a recorded Twitter Space')
    .option('-u, --username <username>', 'a valid twitter username without the @')
    .option('-p, --password <password>', 'a valid password for the username')
    .option('-o, --output <path>', 'output path for the recorded audio/video')
    .option("-d, --disable-browser-login", 'disable logging in with browser if logging in with username and password fails')
    .option("-b, --browser-login", 'login with browser instead (great for privacy)')
    .action((options) => {
        if (!options.id && !options.m3u8) {
            print.error("Error: --id option required");
            process.exit(1);
        }
    });

program.parse(process.argv);

const options: DownloaderOptions = program.opts();


try {
    let task: Downloader;
    if (!options.output) options.output = process.cwd();
    task = await new Downloader(options).init();
    await task.generateAudio();
    await task.cleanup();
} catch (error: any) {
    print.error(error.message);
    process.exit(1);
}