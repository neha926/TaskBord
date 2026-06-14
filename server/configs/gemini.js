import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazily instantiate the client so it always reads the env var
// after dotenv has been loaded by server.js
let _client = null;

export const getAiClient = () => {
    if (!_client) {
        const key = process.env.GEMINI_API_KEY;
        console.log("Using Gemini API Key (starts with):", key ? key.substring(0, 8) : "MISSING");
        if (!key || key === 'your_gemini_api_key_here') {
            throw new Error('GEMINI_API_KEY is not set in .env');
        }
        _client = new GoogleGenerativeAI(key);
    }
    return _client;
};
