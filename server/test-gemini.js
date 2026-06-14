import { GoogleGenerativeAI } from '@google/generative-ai';

const key = "AIzaSyBBq9I09W6krP5KKgH19bP82dI0bXkTh5s";
const genAI = new GoogleGenerativeAI(key);

async function test() {
    try {
        // Unfortunately, @google/generative-ai SDK doesn't expose a direct listModels.
        // Let's try some common model names.
        const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Say hello!");
                console.log(`Success with ${m}:`, result.response.text());
                break;
            } catch (e) {
                console.error(`Failed with ${m}:`, e.message);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
