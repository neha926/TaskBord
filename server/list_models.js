import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  try {
    const key = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(key);
    // Since listModels() method might be different, let's fetch using HTTP
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
