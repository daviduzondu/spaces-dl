import shell from 'shelljs';
import { exec } from 'node:child_process';
import os from 'node:os';
import { print } from '../utils/utils.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const platform = os.platform();
// const executeFile = promisify(execFile);
let whisperCompiledBinaryPath!: string;


if (platform === 'linux' || platform === 'darwin') {
    whisperCompiledBinaryPath = path.join(__dirname, '..', '/bin/whisper/unix/main');
} else if (platform === 'win32') {
    whisperCompiledBinaryPath = path.join(__dirname, '..', '/bin/whisper/windows/main');
} else {
    print.error('Platform not supported');
    process.exit();
}


export const whisper = async (args: string[]) => {
    // return new Promise<void>((resolve, reject) => {
    console.log('Args:', args);

    const command = `${whisperCompiledBinaryPath} ${args.join(' ')}`;

    const child = exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            // reject(new Error(`Error: ${stderr}`));
            return;
        }
        console.log(`stdout: ${stdout}`);
        // resolve();
    });

    child.stdout?.on('data', (data) => {
        console.log(data);
    });

    child.stderr?.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    // });
};
