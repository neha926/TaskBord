import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

//create task
export const createTask = async(req,res)=>{
    try{

        const {userId} = req.auth;
        const {projectId, title , description , type, status , priority , difficulty, assigneeId , due_date }= req.body;
        const origin = req.get('origin')

        const project = await prisma.project.findUnique({
            where : {id : projectId},
            include : {
                members: {include:{user:true}},
                workspace: {include: {members: true}}
            }
        })

        if(!project){
            return res.status(404).json({ message : "Project not found"})
        }

        const assignerWorkspaceMember = project.workspace.members.find(m => m.userId === userId);
        const isAssignerAdmin = assignerWorkspaceMember?.role === "ADMIN" || project.workspace.ownerId === userId;

        // Only Admin or Team Lead can create tasks
        // if(!isAssignerAdmin && project.team_lead !== userId){
        //     return res.status(403).json({ message : "You don't have permission to create tasks in this project"});
        // }

        // Hierarchy Check: Admins cannot be assigned tasks in their own workspace
        if (assigneeId) {
            const assigneeWorkspaceMember = project.workspace.members.find(m => m.userId === assigneeId);
            const isAssigneeAdmin = assigneeWorkspaceMember?.role === "ADMIN" || project.workspace.ownerId === assigneeId;
            
            if (isAssigneeAdmin) {
                return res.status(403).json({ message : "Admins cannot be assigned tasks in their own workspace. They can only have tasks in other workspaces where they are members."});
            }
        }

        if (assigneeId && !project.members.find((member)=>member.user.id === assigneeId)){
            return res.status(403).json({ message : "Assignee is not a member of this project"});
        }

        const task = await prisma.task.create({
            data : {
                projectId,
                title ,
                description,
                priority,
                difficulty: difficulty || "MEDIUM",
                assigneeId,
                status,
                type,
                due_date : due_date ? new Date(due_date) : null,
                completedAt: status === "DONE" ? new Date() : null
            }
        })

        // Initial Status Log
        await prisma.taskStatusLog.create({
            data: {
                taskId: task.id,
                userId: userId,
                fromStatus: status, // Initially from itself to mark creation
                toStatus: status
            }
        });

        const taskWithAssignee = await prisma.task.findUnique({
            where : {id : task.id},
            include : {assignee : true}
        })

        await inngest.send({
            name:"app/task.assigned",
            data:{
                taskId:task.id, origin
            }
        })


        res.json({task : taskWithAssignee, message : "Task Created Successfully"})

    }catch(error){
        console.log(error);
        res.status(500).json({ message : error.code || error.message })
    }
}

//Update Task

export const updateTask = async(req,res)=>{
    try{
        const task = await prisma.task.findUnique({
            where : { id : req.params.id }
        })

        if(!task){
            return res.status(404).json({ message : "Task not found"})
        }
        const {userId} = req.auth;

        const project = await prisma.project.findUnique({
            where : {id : task.projectId},
            include : {
                members: {include:{user:true}},
                workspace: {include: {members: true}}
            }
        })

        if(!project){
            return res.status(404).json({ message : "Project not found"})
        }

        const assignerWorkspaceMember = project.workspace.members.find(m => m.userId === userId);
        const isAssignerAdmin = assignerWorkspaceMember?.role === "ADMIN" || project.workspace.ownerId === userId;
        const isLead = project.team_lead === userId;
        const isAssignee = task.assigneeId === userId;

        const { status, assigneeId, ...otherData } = req.body;

        // Check Permissions
        if (!isAssignerAdmin && !isLead && !isAssignee) {
            return res.status(403).json({ message: "You don't have permission to update this task" });
        }

        // Status Transition Rules
        if (status && status !== task.status) {
            // Employee (Assignee but not Admin/Lead) restrictions
            if (!isAssignerAdmin && !isLead) {
                if (task.status === "DONE") {
                    return res.status(403).json({ message: "Employees cannot reopen completed tasks. Only Leaders can do this." });
                }
            }

            // Tracking Logic
            let completedAt = task.completedAt;
            let reopenedCount = task.reopenedCount;

            if (status === "DONE") {
                completedAt = new Date();
            } else if (task.status === "DONE" && (status === "TODO" || status === "IN_PROGRESS")) {
                reopenedCount += 1;
            }

            // Create Status Log
            await prisma.taskStatusLog.create({
                data: {
                    taskId: task.id,
                    userId: userId,
                    fromStatus: task.status,
                    toStatus: status
                }
            });

            otherData.status = status;
            otherData.completedAt = completedAt;
            otherData.reopenedCount = reopenedCount;
        }

        // Hierarchy Check: Admins cannot be assigned tasks in their own workspace
        if (assigneeId) {
            const assigneeWorkspaceMember = project.workspace.members.find(m => m.userId === assigneeId);
            const isAssigneeAdmin = assigneeWorkspaceMember?.role === "ADMIN" || project.workspace.ownerId === assigneeId;
            
            if (isAssigneeAdmin) {
                return res.status(403).json({ message : "Admins cannot be assigned tasks in their own workspace. They can only have tasks in other workspaces where they are members."});
            }
            
            if (!project.members.find((member)=>member.user.id === assigneeId)){
                return res.status(403).json({ message : "Assignee is not a member of this project"});
            }
            otherData.assigneeId = assigneeId;
        }

        const updatedTask = await prisma.task.update({
            where : { id : req.params.id},
            data: otherData
        })
        res.json({task : updatedTask, message : "Task updated Successfully"})

    }catch(error){
        console.log(error);
        res.status(500).json({ message : error.code || error.message })
    }
}


//Delete Task

export const deleteTask = async(req,res)=>{
    try{
        const {userId} = req.auth;
        const { id } = req.params;
        const { taskIds } = req.body; // Support bulk delete if taskIds provided in body

        const idsToDelete = taskIds || (id ? [id] : []);
        if (idsToDelete.length === 0) {
            return res.status(400).json({ message: "No task IDs provided" });
        }

        const tasks = await prisma.task.findMany({
            where: { id: { in: idsToDelete } },
            include: { project: { include: { workspace: true } } }
        });

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Tasks not found" });
        }

        // Check permissions for each project involved
        const projectIds = [...new Set(tasks.map(t => t.projectId))];
        for (const pid of projectIds) {
            const project = await prisma.project.findUnique({
                where: { id: pid },
                include: { workspace: true }
            });

            if (!project) continue;

            const workspace = project.workspace;
            const userWorkspaceMember = await prisma.workspaceMember.findUnique({
                where: { userId_workspaceId: { userId, workspaceId: workspace.id } }
            });

            const isOwner = workspace.ownerId === userId;
            const isAdmin = userWorkspaceMember?.role === "ADMIN";
            const isLead = project.team_lead === userId;

            if (!isOwner && !isAdmin && !isLead) {
                return res.status(403).json({ message: `You don't have permission to delete tasks in project: ${project.name}` });
            }
        }

        // Delete related comments first
        await prisma.comment.deleteMany({ where: { taskId: { in: idsToDelete } } });
        
        // Delete the tasks
        await prisma.task.deleteMany({ where: { id: { in: idsToDelete } } });
        
        res.json({ message: idsToDelete.length > 1 ? "Tasks deleted Successfully" : "Task deleted Successfully" })

    } catch (error) {
        console.error("Delete task error:", error);
        res.status(500).json({ message: error.code || error.message })
    }
}
