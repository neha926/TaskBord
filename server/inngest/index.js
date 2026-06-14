import { Inngest } from "inngest";
import prisma from "../configs/prisma.js"
import sendEmail from "../configs/nodemailer.js";
import { getAiClient } from "../configs/gemini.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "task" });

//Inngest Function to save user data to a database
const syncUserCreation=inngest.createFunction(
    { id:'sync-user-from-clerk' },
    {event:'clerk/user.created' },
    async ({event})=>
    {
        const{data}=event
        await prisma.user.create({
            data:
            {
                id:data.id,
                email:data?.email_addresses[0]?.email_address,
                name:data?.first_name+ " "+data?.last_name,
                image:data?.image_url,

            }
        })
    }
)

//Inngest Function to delete user data to a database
const syncUserDeletion=inngest.createFunction(
    { id:'delete-user-with-clerk' },
    {event:'clerk/user.deleted' },
    async ({event})=>
    {
        const{data}=event
        await prisma.user.delete({
            where:
            {
                id:data.id,
            }
        })
    }
)

//Inngest Function to update user data to a database
const syncUserUpdation=inngest.createFunction(
    { id:'update-user-from-clerk' },
    {event:'clerk/user.updated' },
    async ({event})=>
    {
        const{data}=event
        await prisma.user.update({
            where:{
                id:data.id
            },
            data:
            {
                email:data?.email_addresses[0]?.email_address,
                name:data?.first_name+ " "+data?.last_name,
                image:data?.image_url,

            }
        })
    }
)

//Inngest Function to save workspace data to a database
const syncworkspaceCreation=inngest.createFunction(
    { id:'sync-workspace-from-clerk' },
    {event:'clerk/organization.created' },
    async ({event})=>
    {
        const{data}=event;

        // Ensure creator exists in DB to prevent P2003
        await prisma.user.upsert({
            where: { id: data.created_by },
            update: {},
            create: {
                id: data.created_by,
                email: "pending-sync@clerk.com", // Will be updated by user.created event
                name: "Workspace Creator",
                image: ""
            }
        });

         await prisma.workspace.upsert({
            where: { id: data.id },
            update: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url
            },
            create:
            {
                id:data.id,
                name:data.name,
                slug:data.slug,
                ownerId:data.created_by,
                image_url:data.image_url
            }
        })
        await prisma.workspaceMember.upsert({
            where: { userId_workspaceId: { userId: data.created_by, workspaceId: data.id } },
            update: { role: 'ADMIN' },
            create: {
                userId:data.created_by,
                workspaceId:data.id,
                role:'ADMIN'
            }
        })
    }
)

//Inngest Function to update workspace data to a database
const syncworkspaceUpdation=inngest.createFunction(
    { id:'update-workspace-from-clerk' },
    {event:'clerk/organization.updated' },
    async ({event})=>
    {
        const{data}=event
         await prisma.workspace.update({
            where:{
                id:data.id
            },
            data:
            {
                name:data.name,
                slug:data.slug,
                image_url:data.image_url

            }
        })
        
    }
)

//Inngest Function to delete workspace data to a database
const syncworkspaceDeletion=inngest.createFunction(
    { id:'delete-workspace-from-clerk' },
    {event:'clerk/organization.deleted' },
    async ({event})=>
    {
        const{data}=event
         await prisma.workspace.delete({
            where:{
                id:data.id
            }
        })
        
    }
)

//Inngest Function to save workspace member data to a database
const syncWorkpaceMemberCreation=inngest.createFunction(
    { id:'create-workspace-member-from-clerk' },
    {event:'clerk/organizationMembership.created' },
    async ({event})=>
    {
        const{data}=event;
        const userId = data.public_user_data?.user_id || data.user_id;
        const workspaceId = data.organization?.id || data.organization_id;

        if (!userId || !workspaceId) return;

        // Ensure user exists in DB to prevent P2003
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: data.public_user_data?.identifier || "invited-user@clerk.com",
                name: `${data.public_user_data?.first_name || ""} ${data.public_user_data?.last_name || ""}`.trim() || "Invited User",
                image: data.public_user_data?.image_url || ""
            }
        });

         await prisma.workspaceMember.upsert({
            where: {
                userId_workspaceId: {
                    userId: userId,
                    workspaceId: workspaceId
                }
            },
            update: {
                role: String(data.role || 'MEMBER').split(':').pop().toUpperCase()
            },
            create: {
                userId: userId,
                workspaceId: workspaceId,
                role: String(data.role || 'MEMBER').split(':').pop().toUpperCase()
            }
        })
        
    }
)



//Inngest Function to send email on task creation
const sendTaskAssignmentEmail = inngest.createFunction(
    { id: "send-task-assignment-mail" },
    { event: "app/task.assigned" },
    async ({ event, step }) => {
        const {taskId ,origin} = event.data;

        const task = await prisma.task.findUnique({
            where: {id: taskId},
            include: {assignee: true, project:true}
        })
    
        await sendEmail({
            to: task.assignee.email,
            subject: `New Task Assignment in ${task.project.name}`,
            body: `<div style ="max-width:600px;">
                     <h2>Hi ${task.assignee.name}, </h2>

                     <p style="font-size: 16px;">You've been assigned a new task:</p>
                     <p style="font-size: 18px; font-weight: bold;  color: #007bff;
                     margin:8px 0;">${task.title}</p>


                     <div style="border:1px solid #ddd; padding:12px 16px; 
                     border-radius:6px; margin-bottom: 30px;"> 
                        <p style ="margin:6px 0;"><strong>Description:</strong> ${task.description}</p>   
                        <p style ="margin:6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
                     </div>
                     <a href="${origin}" style="background-color:#007bff; padding: 12px 24px; border-radius:5px; color:#fff;font-weight:600; font-size:16px; text-decoration:none;">
                            View Task
                     </a>
                     
                     <p style="margin-top; 20px;font-size:14px; color:#6c757d;">
                            Please make sure to review and complete it before the due date.
                     </p>
                     </div>`
        })
        if(new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()){
            await step.sleepUntil('wait-for-the-due-date', new Date(task.due_date));

            await step.run('check-if-task-is-completed', async()=>{
                const task = await prisma.task.findUnique({
                    where: {id: taskId},
                    include: {assignee: true, project:true}
                })
                if(!task) return;

                if(task.status !== "DONE"){
                    await step.run('send-task-reminder-main', async()=>{
                    await sendEmail({
                    to:task.assignee.email,
                    subject:`Remainder for ${task.project.name}`,
                    body: `<div style ="max-width:600px;">
                     <h2>Hi ${task.assignee.name}, </h2>

                     <p style="font-size: 16px;">You've been assigned a new task:</p>
                     <p style="font-size: 18px; font-weight: bold;  color: #007bff;
                     margin:8px 0;">${task.title}</p>


                     <div style="border:1px solid #ddd; padding:12px 16px; 
                     border-radius:6px; margin-bottom: 30px;"> 
                        <p style ="margin:6px 0;"><strong>Description:</strong> ${task.description}</p>   
                        <p style ="margin:6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
                     </div>

                     <a href="${origin}" style="background-color:#007bff; padding: 12px 24px; border-radius:5px; color:#fff;font-weight:600; font-size:16px; text-decoration:none;">
                            View Task
                     </a>
                     
                     <p style="margin-top; 20px;font-size:14px; color:#6c757d;">
                            Please make sure to review and complete it before the due date.
                     </p>
                     </div>`
                })
            })
        }
    })
}

}
)

//Inngest Function to generate weekly standup report
const generateWeeklyStandupReport = inngest.createFunction(
    { id: "generate-weekly-standup" },
    { cron: "0 16 * * 5" }, // Every Friday at 4 PM
    async ({ step }) => {
        await step.run("fetch-and-generate-report", async () => {
            try {
                // Find active projects with their Team Lead
                const projects = await prisma.project.findMany({
                    where: { status: "ACTIVE" },
                    include: { 
                        owner: true, 
                        tasks: {
                            where: {
                                updatedAt: {
                                    gte: new Date(new Date().setDate(new Date().getDate() - 7))
                                }
                            },
                            include: { assignee: true }
                        }
                    }
                });

                for (const project of projects) {
                    if (!project.owner?.email || project.tasks.length === 0) continue;

                    const taskList = project.tasks.map(t => 
                        `- ${t.title} (${t.status}) assigned to ${t.assignee?.name || 'Unassigned'}`
                    ).join('\n');

                    const prompt = `
                    You are an AI assistant tasked with writing a weekly executive summary for a project manager.
                    Project: ${project.name}
                    Recent task activity from the past 7 days:
                    ${taskList}
                    
                    Please generate a brief, professional "Weekly Progress Report" outlining what was worked on, completed, and what is currently in progress. 
                    Format this nicely with basic HTML tags if needed, or plain text. Keep it under 150 words.
                    `;

                    const response = await getAiClient().models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                    });

                    await sendEmail({
                        to: project.owner.email,
                        subject: `Weekly Standup Report: ${project.name}`,
                        body: `
                            <div style="font-family: sans-serif; max-width: 600px;">
                                <h2>Weekly Standup Report</h2>
                                <p><strong>Project:</strong> ${project.name}</p>
                                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                                    ${response.text.replace(/\n/g, '<br/>')}
                                </div>
                            </div>
                        `
                    });
                }
            } catch (error) {
                console.error("Standup report generation failed", error);
            }
        });
    }
);




// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    syncworkspaceCreation,
    syncworkspaceUpdation,
    syncworkspaceDeletion,
    syncWorkpaceMemberCreation,
    
    sendTaskAssignmentEmail,
    generateWeeklyStandupReport
];
