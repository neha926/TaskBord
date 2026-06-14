import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testPrompt() {
  try {
    const key = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });
    
    const userTasks = [
      { id: '1', title: 'Task 1', priority: 'HIGH', status: 'TODO', due_date: null },
      { id: '2', title: 'Task 2', priority: 'MEDIUM', status: 'IN_PROGRESS', due_date: null }
    ];

    const prompt = `
        You are a smart AI project manager assistant.
        Analyze these tasks: ${JSON.stringify(userTasks)}.
        Keep in mind priority (HIGH/MEDIUM/LOW) and due dates.
        Output a "Smart Daily Agenda" identifying what the user should tackle first today.
        Use clean, concise Markdown formatting.
        `;

    console.log("Calling Gemini API...");
    const result = await model.generateContent(prompt);
    console.log("Response:", await result.response.text());
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testPrompt();
