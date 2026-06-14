import prisma from "../configs/prisma.js";
import { getAiClient } from "../configs/gemini.js";

// Helper for sentiment analysis
const analyzeSentiment = async (content) => {
    try {
        const genAI = getAiClient();
        const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });
        
        const prompt = `Classify the sentiment of this task comment as 'GOOD', 'BAD', or 'NEUTRAL'. 
        'GOOD' means positive feedback, encouragement, or successful completion. 
        'BAD' means negative feedback, criticism, or reporting issues/delays. 
        'NEUTRAL' is for everything else.
        Respond with ONLY one word: GOOD, BAD, or NEUTRAL.
        Comment: "${content}"`;

        const result = await model.generateContent(prompt);
        const sentiment = result.response.text().trim().toUpperCase();
        
        if (['GOOD', 'BAD', 'NEUTRAL'].includes(sentiment)) {
            return sentiment;
        }
        return 'NEUTRAL';
    } catch (error) {
        console.error("Sentiment analysis error:", error);
        // Fallback to simple keyword check
        const lower = content.toLowerCase();
        if (lower.includes("good") || lower.includes("great") || lower.includes("excellent") || lower.includes("done") || lower.includes("thanks")) return "GOOD";
        if (lower.includes("bad") || lower.includes("issue") || lower.includes("error") || lower.includes("fail") || lower.includes("delay")) return "BAD";
        return "NEUTRAL";
    }
};

//Add comment
export const addComment = async (req, res) => {
    try{
        const {userId} = req.auth;
        const {content, taskId} = req.body;

        //check if user is project member
        const task =await prisma.task.findUnique({
            where: {id: taskId},
        })

        const project = await prisma.project.findUnique({
            where : {id : task.projectId},
            include : {members : {include : {user : true}}}
        })

        if(!project){
            return res.status(404).json({ message : "Project not found"});
        }
        
// if project is available
        const member = project.members.find((member) => member.userId === userId);

        if(!member){
            return res.status(403).json({ message : "You are not a member of this project"});
         }

         const sentiment = await analyzeSentiment(content);

         const comment = await prisma.comment.create({
            data: {taskId, content, userId, sentiment},
           include : {user : true}
        })

        res.json({comment})


    } catch(error) {
        console.error("Add Comment Error:", error);
        res.status(500).json({ message : "Internal server error" });
    }
    
}

//Get comments for task
export const getTaskComments = async (req, res) => {
    try{
        const {taskId} = req.params;
        const comments = await prisma.comment.findMany({
            where : {taskId}, include : {user : true}
        })

        res.json({comments})
    } catch(error) {
        console.error("Get Comments Error:", error);
        res.status(500).json({ message : "Internal server error" });
    }
}