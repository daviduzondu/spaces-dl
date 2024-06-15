import { Command } from 'commander';
import { LANGUAGES } from '../constants/constants.js';
import { Downloader } from '../index.js';
const program = new Command();
program
    .name('spaces-dl')
    .description('CLI to download recorded Twitter Spaces')
    .version('0.0.1')
    .option('-a, --audio', 'generate audio')
    .option('-v, --video', 'create a video from the twitter space')
    .option('-i, --id <id>', 'A valid ID for a recorded Twitter Space')
    .option('-u, --username <username>', 'a valid twitter username without the @')
    .option('-p, --password <password>', 'a valid password for the username')
    .option('-o, --output <path>', 'output path for the recorded audio/video')
    .option('-t, --transcribe', 'Transcribe the audio. Transcriptions are stored in a .srt file')
    .option('-l, --language <language>', 'Supported language code for Twitter Space audio', (value) => {
    if (!Object.keys(LANGUAGES).includes(value)) {
        console.error(`Invalid language code. Supported languages: ${Object.keys(LANGUAGES).join(', ')}`);
        process.exit(1);
    }
    return value;
})
    .option('-m, --model-path', 'Path to the Whisper model to use')
    .option('-pl, --print-lang', 'Print all supported languages for transcription')
    .action((options) => {
    if (!options.id) {
        console.error("Error: --id option required");
        process.exit(1);
    }
    if (options.printLang) {
        console.log('Supported languages for transcription:' + '\n');
        console.log("CODE\t", "LANGUAGE\n");
        console.log(Object.entries(LANGUAGES)
            .map(([code, language]) => `${code}\t ${language}`)
            .join('\n'));
        process.exit(0); // Exit after printing languages
    }
    // Validate options dependency
    if (options.language && !options.transcribe) {
        console.error('Error: --language option requires --transcribe option.');
        process.exit(1);
    }
    // console.log('Options:', options);
});
program.parse(process.argv);
const options = program.opts();
try {
    console.log(options);
    const task = await new Downloader(options).init();
    if (options.audio)
        await task.generateAudio();
    if (options.video)
        await task.generateVideo();
    if (options.transcribe)
        await task.generateSubtitle();
    await task.cleanup();
}
catch (error) {
    throw error;
}
