import prisma from "./configs/prisma.js";

async function seed() {
    const users = await prisma.user.findMany();
    if (users.length === 0) return;
    
    const owner = users[0];

    const workspace = await prisma.workspace.create({
        data: {
            id: "ws-1",
            name: "My Workspace",
            slug: "my-ws",
            ownerId: owner.id,
            members: {
                create: {
                    userId: owner.id,
                    role: "ADMIN"
                }
            }
        }
    });

    const project = await prisma.project.create({
        data: {
            name: "Initial Project",
            description: "Restored dummy project",
            priority: "MEDIUM",
            status: "ACTIVE",
            team_lead: owner.id,
            workspaceId: workspace.id,
            members: {
                create: {
                    userId: owner.id
                }
            }
        }
    });

    await prisma.task.create({
        data: {
            projectId: project.id,
            title: "First Task",
            description: "You can start using the project again.",
            assigneeId: owner.id,
            status: "TODO",
            due_date: new Date()
        }
    });
    console.log("Seeded basic project.");
}
seed().catch(console.error).finally(() => prisma.$disconnect());
