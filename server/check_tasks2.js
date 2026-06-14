import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTasks() {
    const tasks = await prisma.task.findMany({ 
        where: { assigneeId: 'user_3AuE7RuMAyxdLBapRI6ND9WOj7Z', status: 'DONE' },
        select: { title: true, due_date: true, completedAt: true }
    });
    console.log(JSON.stringify(tasks, null, 2));
}

checkTasks().finally(() => prisma.$disconnect());
