const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'temp', '2025.txt');

try {
    const buffer = fs.readFileSync(filePath);
    const decoder = new TextDecoder('shift-jis');
    const text = decoder.decode(buffer);
    console.log(text.substring(0, 500));
} catch (e) {
    console.error(e);
}
