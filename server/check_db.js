import prisma from "./configs/prisma.js";

async function check() {
    const projects = await prisma.project.count();
    const tasks = await prisma.task.count();
    const users = await prisma.user.count();
    console.log(`Projects: ${projects}, Tasks: ${tasks}, Users: ${users}`);
}
check().catch(console.error).finally(() => prisma.$disconnect());
