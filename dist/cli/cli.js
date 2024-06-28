import { Command } from 'commander';
import { Downloader } from '../index.js';
const program = new Command();
program
    .name('spaces-dl')
    .description('CLI to download recorded Twitter Spaces')
    .version('0.0.1')
    .option('-a, --audio', 'generate audio')
    .option('-m, --m3u8', 'm3u8 file url')
    .option('-i, --id <id>', 'A valid ID for a recorded Twitter Space')
    .option('-u, --username <username>', 'a valid twitter username without the @')
    .option('-p, --password <password>', 'a valid password for the username')
    .option('-o, --output <path>', 'output path for the recorded audio/video')
    .action((options) => {
    if (!options.id && !options.m3u8) {
        console.error("Error: --id option required");
        process.exit(1);
    }
});
program.parse(process.argv);
const options = program.opts();
try {
    console.log(options);
    let task;
    if (!options.m3u8) {
        task = await new Downloader(options).init();
    }
    else {
        options.id = 'somethingxxx';
        task = await new Downloader(options);
        await task.downloadFromM3U8(options.m3u8);
    }
    if (options.audio)
        await task.generateAudio();
    await task.cleanup();
}
catch (error) {
    throw error;
}
