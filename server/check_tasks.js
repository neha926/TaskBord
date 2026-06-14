import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTasks() {
    const tasks = await prisma.task.findMany({ include: { assignee: true } });
    console.log(JSON.stringify(tasks.filter(t => t.status === 'DONE'), null, 2));
}

checkTasks().finally(() => prisma.$disconnect());
