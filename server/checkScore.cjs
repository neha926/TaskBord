const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
    const user = await prisma.user.findFirst({ 
        include: { tasks: { include: { statusLog: true } } } 
    }); 
    
    let score = 0; 
    console.log("User:", user.email);
    user.tasks.forEach(task => { 
        console.log("---- Task ----");
        console.log("Title:", task.title);
        console.log("Status:", task.status);
        console.log("Reopened Count:", task.reopenedCount);
        
        if (task.status === 'DONE') { 
            score += 20; 
            console.log("+20 Base for DONE. Score:", score);
            
            score -= (task.reopenedCount * 10); 
            console.log(`-${task.reopenedCount * 10} for reopened. Score:`, score);
            
            let act = task.completedAt || task.updatedAt; 
            if (act && task.due_date) { 
                if (new Date(act) <= new Date(task.due_date)) { 
                    score += 5; 
                    console.log("+5 for ON TIME. Score:", score);
                } else { 
                    score -= 5; 
                    console.log("-5 for LATE. Score:", score);
                } 
            } 
        } 
        
        let inP = task.statusLog.filter(l => l.toStatus === 'IN_PROGRESS').length; 
        console.log("Times moved to IN_PROGRESS:", inP);
        if (inP > 1) { 
            score -= ((inP - 1) * 5); 
            console.log(`-${(inP - 1) * 5} penalty for paused/restarted. Score:`, score);
        } 
        console.log(`Current Score: ${score}`); 
    }); 
    console.log("Final Math.max(0, score) =", Math.max(0, score));
} 

main().catch(console.error).finally(() => prisma.$disconnect());
