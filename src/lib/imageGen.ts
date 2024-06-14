import { createCanvas, registerFont } from 'canvas';
import fsPromises from 'fs-extra';
const width = 1200;
const height = 627;
// Extract the starting Y value for the title's position, which
// we'll move if we add a second line.
const titleY = 50;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

ctx.fillStyle = "#000000";
ctx.fillRect(0, 0, width, height);
ctx.textDrawingMode = "glyph";

export default async function generateImage(title: string) {
    ctx.font = 'bold 20pt "Arial"';
    ctx.fillStyle = "#fff";
    ctx.quality = 'best';

    const wrapText = () => {
        const words = title.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const actualBoundingBoxRight = ctx.measureText(currentLine + ' ' + word).actualBoundingBoxRight;

            if (actualBoundingBoxRight < width - 30) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        return lines.join('\n');
    };

    // Wrap the title text to fit within the specified width
    title = wrapText(); // Adjust the max width as needed

    // Split the wrapped title into lines
    const lines = title.split('\n');

    // Draw each line of the wrapped title
    let currentY = titleY;
    ctx.fillText(title, 30, currentY);
    // lines.forEach(line => {
    //     currentY += 30; // Use the line height of 100 pixels for this example
    // });

    const buffer = canvas.toBuffer("image/png");
    await fsPromises.outputFile("./image.png", buffer);
}

// Example usage:
generateImage("SUNGAY SERVICE: Genuine Friendships really possible in d 🏳️‍🌈 community?");
