import { createCanvas, loadImage } from 'canvas';
const width = 1920;
const height = 1080;
const scaleFactor = 2; // Increase resolution by a factor of 2
const scaledWidth = width * scaleFactor;
const scaledHeight = height * scaleFactor;
const titleY = scaledHeight / 9;
const canvas = createCanvas(scaledWidth, scaledHeight);
const ctx = canvas.getContext('2d');
const linearGradient = ctx.createLinearGradient(1000, 700, scaledWidth, 400);
linearGradient.addColorStop(0, '#2d1bb5');
linearGradient.addColorStop(0.5, '#511adb');
// linearGradient.addColorStop(1, 'green');
ctx.fillStyle = linearGradient;
// ctx.fillStyle = "#0f59d1";
ctx.fillRect(0, 0, scaledWidth, scaledHeight);
ctx.textDrawingMode = "glyph";
export default async function generateImage(title, hostImg, hostDisplayName, hostUsername, tunedInCount, date) {
    ctx.textAlign = 'center';
    ctx.fillStyle = "#fff";
    ctx.quality = 'best';
    ctx.font = `bold ${38 * scaleFactor}pt "Arial"`;
    const wrapText = () => {
        const words = title.split(' ');
        let lines = [];
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const wordWidth = ctx.measureText(currentLine + ' ' + word).width;
            if (wordWidth < scaledWidth) {
                currentLine += ' ' + word;
            }
            else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines.join('\n');
    };
    console.log(wrapText());
    title = wrapText();
    const lines = title.split('\n');
    let currentY = titleY;
    lines.forEach(line => {
        ctx.fillText(line, scaledWidth / 2, currentY);
        currentY += 50 * scaleFactor;
    });
    ctx.font = `${28 * scaleFactor}pt "Arial"`;
    ctx.fillText(`${tunedInCount} people tuned in • ${date}`, scaledWidth / 2, currentY += 10 * scaleFactor);
    ctx.font = `bold ${27 * scaleFactor}pt "Arial"`;
    if (hostImg) {
        const img = await loadImage(hostImg);
        const imgSize = 400 * scaleFactor;
        const centerX = scaledWidth / 2;
        const imgY = currentY + 75 * scaleFactor;
        const radius = imgSize / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, imgY + radius, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, centerX - radius, imgY, imgSize, imgSize);
        ctx.restore();
        currentY += imgSize + 125 * scaleFactor;
    }
    else {
        currentY += 75 * scaleFactor;
    }
    ctx.font = `${27 * scaleFactor}pt "Arial"`;
    ctx.fillText(hostDisplayName, scaledWidth / 2, currentY += 70 * scaleFactor);
    ctx.font = `${25 * scaleFactor}pt "Arial"`;
    ctx.fillText(`@${hostUsername}`, scaledWidth / 2, currentY += 45 * scaleFactor);
    ctx.font = `bold ${23 * scaleFactor}pt "Arial"`;
    ctx.fillText("Host", scaledWidth / 2, currentY += 40 * scaleFactor);
    const buffer = canvas.toBuffer("image/png");
    // Scale down the image to the original size
    const outputCanvas = createCanvas(width, height);
    const outputCtx = outputCanvas.getContext('2d');
    const img = await loadImage(buffer);
    outputCtx.drawImage(img, 0, 0, width, height);
    const outputBuffer = outputCanvas.toBuffer("image/png");
    return outputBuffer;
}
