import prisma from "../configs/prisma.js";
import { getAiClient } from "../configs/gemini.js";

export const getSmartAgenda = async (req, res) => {
    try {
        const { userId } = req.auth;
        
        // Fetch user's active tasks
        const userTasks = await prisma.task.findMany({
            where: { assigneeId: userId, status: { not: "DONE" } },
            select: {
                id: true,
                title: true,
                priority: true,
                status: true,
                due_date: true
            }
        });

        if (userTasks.length === 0) {
            return res.json({ agenda: "You have no pending tasks right now. Great job!" });
        }

        const prompt = `
        You are a smart AI project manager assistant.
        Analyze these tasks: ${JSON.stringify(userTasks)}.
        Keep in mind priority (HIGH/MEDIUM/LOW) and due dates.
        Output a "Smart Daily Agenda" identifying what the user should tackle first today.
        Use clean, concise Markdown formatting.
        `;

        // Generate content with Gemini
        try {
            console.log("Calling Gemini API for Smart Agenda...");
            const genAI = getAiClient();
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            res.json({ agenda: response.text() });
        } catch (aiError) {
            console.error("Gemini API Error (Agenda):", aiError.message);
            // Fallback for quota or other AI issues
            res.json({ 
                agenda: "Your AI Smart Agenda is currently resting. Focus on your High Priority tasks first!",
                isFallback: true 
            });
        }
    } catch (error) {
        console.error("Smart Agenda Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getCommentSummary = async (req, res) => {
    try {
        const { taskId } = req.params;
        const comments = await prisma.comment.findMany({
            where: { taskId },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });

        if (comments.length === 0) {
            return res.json({ summary: "No comments available to summarize." });
        }

        const discussion = comments.map(c => `${c.user.name}: ${c.content}`).join('\n');

        const prompt = `
        Summarize the following discussion strictly in 3 short, bulleted sentences. Focus on decisions and next steps.
        Discussion thread:
        ${discussion}
        `;

        try {
            console.log("Calling Gemini API for Comment Summary...");
            const genAI = getAiClient();
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            res.json({ summary: response.text() });
        } catch (aiError) {
            console.error("Gemini API Error (Summary):", aiError.message);
            res.json({ summary: "AI Summary is temporarily unavailable. Check the discussion below for details." });
        }
    } catch (error) {
        console.error("Comment Summary Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const suggestComplexity = async (req, res) => {
    try {
        const { title, description } = req.body;
        
        if (!title) return res.status(400).json({ message: "Title is required for estimation." });

        const prompt = `
        You are an expert software project manager.
        Estimate the complexity of this task.
        Title: ${title}
        Description: ${description || "None"}

        Levels:
        - EASY: Minor UI fix, typo, or simple config change.
        - MEDIUM: Standard feature development, new component, or typical API endpoint.
        - HARD: Architecture change, security fix, database migration, or complex logic.

        Respond ONLY with one of these three words: EASY, MEDIUM, HARD.
        Do not add any explanation or punctuation.
        `;

        try {
            console.log("Calling Gemini API for Complexity Estimation...");
            const genAI = getAiClient();
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const rawText = response.text();
            
            const cleanedText = rawText.trim().toUpperCase();
            
            console.log("AI Raw Complexity Suggestion:", cleanedText || "EMPTY RESPONSE");

            if (!cleanedText) {
                return res.json({ difficulty: "MEDIUM", isFallback: true, error: "Empty AI response" });
            }

            // Robust parsing: search for keywords if "ONLY one word" failed
            let finalComplexity = "MEDIUM";
            if (cleanedText.includes("HARD")) {
                finalComplexity = "HARD";
            } else if (cleanedText.includes("EASY")) {
                finalComplexity = "EASY";
            } else if (cleanedText.includes("MEDIUM")) {
                finalComplexity = "MEDIUM";
            }
            
            res.json({ difficulty: finalComplexity, raw: rawText });
        } catch (aiError) {
            console.error("Gemini API Error (Complexity):", aiError);
            res.json({ difficulty: "MEDIUM", isFallback: true, error: aiError.message });
        }
    } catch (error) {
        console.error("Suggest Complexity Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
