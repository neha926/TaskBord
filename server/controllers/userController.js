import prisma from "../configs/prisma.js";

import { getAiClient } from "../configs/gemini.js";

export const generatePortfolioQuestions = async (req, res) => {
    try {
        const questions = [
            "Please provide a short Bio about yourself.",
            "What are your top Skills? (e.g., React, Python, Design)",
            "Tell me about your Work Experience. (Company, Role, and Duration)",
            "What is your Educational background? (College, Degree, Year)",
            "List your notable Projects or Achievements."
        ];
        res.json({ questions });
    } catch (error) {
        console.error("Generate Questions Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const parsePortfolioResponse = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { userInput } = req.body;

        const prompt = `You are a helpful assistant. Extract portfolio information from the following user input and return it as a structured JSON object. 
        Input: "${userInput}"
        Output schema: {
            "bio": "string",
            "skills": "string (comma separated)",
            "organization": "string",
            "education": [{"school": "string", "degree": "string", "year": "string"}],
            "experience": [{"company": "string", "role": "string", "duration": "string", "description": "string"}],
            "projects_info": [{"name": "string", "description": "string", "link": "string"}],
            "achievements": "string (comma separated)"
        }
        Requirements:
        - If the input is simple text like "3 year" for experience, format it into the structure: {"company": "Not Specified", "role": "Professional", "duration": "3 year", "description": ""}
        - If the input is simple text like "SPPU University" for education, format it: {"school": "SPPU University", "degree": "Not Specified", "year": "Not Specified"}
        - If the input is simple text like "book management" for projects, format it: {"name": "book management", "description": "Not Specified", "link": ""}
        - Return ONLY the raw JSON block. No markdown. If no relevant info is found, return an empty object {}.`;

        const genAI = getAiClient();
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            
            let extractedData = {};
            try {
                const jsonStart = text.indexOf('{');
                const jsonEnd = text.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    extractedData = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
                }
            } catch (e) {
                console.error("JSON Parse Error in Extraction:", e);
            }

            if (Object.keys(extractedData).length > 0) {
                const validFields = ["bio", "skills", "organization", "education", "experience", "projects_info", "achievements"];
                const filteredData = {};
                for (const key of validFields) {
                    if (extractedData[key] !== undefined && extractedData[key] !== null && extractedData[key] !== "") {
                        filteredData[key] = extractedData[key];
                    }
                }

                if (Object.keys(filteredData).length > 0) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: filteredData
                    });
                }
            }
            res.json({ success: true, message: "Input processed" });
        } catch (aiError) {
            console.error("Gemini API Error (Portfolio):", aiError.message);
            // If AI is down, we don't save complex fields but don't crash
            res.json({ success: false, message: "AI is currently busy. Basic info saved, portfolio will be updated later." });
        }

    } catch (error) {
        console.error("Parse Response Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getProfile = async (req, res) => {
    try {
        const { userId } = req.auth;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                tasks: {
                    include: {
                        project: {
                            include: { workspace: true }
                        },
                        comments: true,
                        statusLog: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Performance & Accuracy Calculation Logic
        let score = 0;
        let totalCompletedTasks = 0;
        let totalReopenedCount = 0;
        let totalOnTime = 0;
        let totalLate = 0;
        
        let totalInProgressMoves = 0;
        let tasksStarted = 0;

        user.tasks.forEach(task => {
            if (task.status !== "TODO") tasksStarted++;

            if (task.status === "DONE") {
                totalCompletedTasks++;
                score += 20; // Base score for completing a task
                
                // Reopened Penalty
                totalReopenedCount += task.reopenedCount;
                score -= (task.reopenedCount * 10);

                // Time factor
                let actualCompletedAt = task.completedAt || task.updatedAt;
                if (actualCompletedAt && task.due_date) {
                    if (new Date(actualCompletedAt) <= new Date(task.due_date)) {
                        totalOnTime++;
                        score += 5;
                    } else {
                        totalLate++;
                        score -= 5;
                    }
                }
            }


            // Accuracy tracking: How many times it went to IN_PROGRESS
            let inProgressCount = task.statusLog.filter(log => log.toStatus === "IN_PROGRESS").length;
            totalInProgressMoves += inProgressCount;
            
            // If a task is moved to IN_PROGRESS more than once, it means it was paused/restarted.
            if (inProgressCount > 1) {
                score -= ((inProgressCount - 1) * 5); // penalty for moving it back and forth
            }
        });

        const finalScore = Math.max(0, Math.min(100, score));

        // Accuracy percentage
        let accuracy = 0; // default for new users or no tasks started
        if (tasksStarted > 0) {
            let excessMoves = Math.max(0, totalInProgressMoves - tasksStarted);
            // Start at 100% for active tasks, then deduct 10% for every excess move (re-start), and 15% for every reopened task
            accuracy = Math.max(0, 100 - (excessMoves * 10) - (totalReopenedCount * 15));
        }

        const analytics = {
            score: finalScore,
            accuracy: accuracy,
            completedTasks: totalCompletedTasks,
            reopenedCount: totalReopenedCount,
            onTime: totalOnTime,
            late: totalLate
        };

        res.json({ user, analytics });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { name, bio, skills, organization, profileCompleted, achievements, experience, education, projects_info } = req.body;

        // Directly update the fields provided in the body
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (bio !== undefined) updateData.bio = bio;
        if (skills !== undefined) updateData.skills = skills;
        if (organization !== undefined) updateData.organization = organization;
        if (profileCompleted !== undefined) updateData.profileCompleted = profileCompleted;
        if (achievements !== undefined) updateData.achievements = achievements;
        if (experience !== undefined) updateData.experience = experience;
        if (education !== undefined) updateData.education = education;
        if (projects_info !== undefined) updateData.projects_info = projects_info;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        res.json({ user: updatedUser, message: "Profile updated successfully" });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getEmployeePerformance = async (req, res) => {
    try {
        const { userId: requesterId } = req.auth;
        const { employeeId } = req.params;

        // Ensure requester is ADMIN in at least one workspace where the employee is a member
        const requesterMemberships = await prisma.workspaceMember.findMany({
            where: { userId: requesterId, role: "ADMIN" }
        });

        if (requesterMemberships.length === 0) {
            return res.status(403).json({ message: "Only Admins can view employee performance" });
        }

        const employee = await prisma.user.findUnique({
            where: { id: employeeId },
            include: {
                tasks: {
                    include: {
                        comments: true,
                        statusLog: true
                    }
                }
            }
        });

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Performance Calculation Logic
        let score = 0;
        let totalCompletedTasks = 0;
        let totalReopenedCount = 0;
        let totalOnTime = 0;
        let totalLate = 0;

        employee.tasks.forEach(task => {
            if (task.status === "DONE") {
                totalCompletedTasks++;
                score += 20; // Base score for completing a task
                
                // Reopened Penalty
                totalReopenedCount += task.reopenedCount;
                score -= (task.reopenedCount * 10);

                // Time factor
                if (task.completedAt && task.due_date) {
                    if (new Date(task.completedAt) <= new Date(task.due_date)) {
                        totalOnTime++;
                        score += 5;
                    } else {
                        totalLate++;
                        score -= 5;
                    }
                }
            }

            // Accuracy tracking: How many times it went to IN_PROGRESS
            let inProgressCount = task.statusLog.filter(log => log.toStatus === "IN_PROGRESS").length;
            
            // If a task is moved to IN_PROGRESS more than once, it means it was paused/restarted.
            if (inProgressCount > 1) {
                score -= ((inProgressCount - 1) * 5); // penalty for moving it back and forth
            }

        });

        // Normalize score between 0-100
        const finalScore = Math.max(0, Math.min(100, score));

        res.json({
            employee: {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                image: employee.image
            },
            analytics: {
                score: finalScore,
                completedTasks: totalCompletedTasks,
                reopenedCount: totalReopenedCount,
                onTime: totalOnTime,
                late: totalLate
            }
        });

    } catch (error) {
        console.error("Employee Performance Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getUserAnalytics = async (req, res) => {
    try {
        const { userId } = req.auth;

        const workspaces = await prisma.workspace.findMany({
            where: {
                members: { some: { userId } }
            },
            include: {
                projects: {
                    where: {
                        members: { some: { userId } }
                    },
                    include: {
                        tasks: {
                            where: { assigneeId: userId }
                        }
                    }
                }
            }
        });

        // Structure: Org -> Project -> Task Analytics
        const analytics = workspaces.map(ws => ({
            organization: ws.name,
            projects: ws.projects.map(p => ({
                name: p.name,
                totalTasks: p.tasks.length,
                completedTasks: p.tasks.filter(t => t.status === "DONE").length,
                progress: p.progress
            }))
        }));

        res.json({ analytics });
    } catch (error) {
        console.error("User Analytics Error:", error);
        res.status(500).json({ message: error.message });
    }
};
