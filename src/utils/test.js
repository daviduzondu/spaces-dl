import readline from 'readline';
process.stdout.write('This is a message');

setTimeout(() => {
  readline.clearLine(process.stdout, 0);
}, 2000);
process.stdout.write('This is another message');
console.log(process.stdout);

setTimeout(() => {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(0);
  process.stdout.write('\n');
  readline.moveCursor(process.stdout, 0, -1);
  process.stdout.write('someone');
}, 2000);
