const https = require('https');

const key = "AIzaSyBBq9I09W6krP5KKgH19bP82dI0bXkTh5s";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        console.log("Response:", data);
    });
}).on('error', (err) => {
    console.error("Error:", err.message);
});
