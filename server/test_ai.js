import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testAI() {
  try {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testing with key:", key.substring(0, 8) + "...");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Hello, say hi!");
    console.log("Success:", await result.response.text());
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testAI();
