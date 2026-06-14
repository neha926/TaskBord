import prisma from "../configs/prisma.js"
import { clerk } from "../server.js"


export const getUserWorkspaces = async (req , res) => {
    try{
        const {userId} = req.auth;
        const workspaces = await prisma.workspace.findMany({
            where:{
                members: {some: {userId: userId}}
            },
            include:{
                members: {include : {user : true}},
                projects:{
                    include:{
                        tasks:{include:{assignee:true, comments:{include:{user:true}}}},
                        members:{ include : { user : true}}
                    }
                },
                owner : true
            }
        });
        res.json({workspaces})
    }catch(error){
        console.log(error)
        res.status(500).json({message: error.code || error.message})
        
    }
} 

// Ensure active Clerk organization is synced as workspace membership
export const syncActiveMembership = async (req, res) => {
    try {
        const { userId, orgId } = req.auth;
        const { workspaceId, name, slug, image_url } = req.body || {};
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const activeOrgId = orgId || workspaceId;
        if (!activeOrgId) return res.status(400).json({ message: "No active organization" });

        let workspace = await prisma.workspace.findUnique({
            where: { id: activeOrgId }
        });
        
        // If workspace doesn't exist in our DB, create it using info from frontend
        if (!workspace && name) {
            workspace = await prisma.workspace.create({
                data: {
                    id: activeOrgId,
                    name: name,
                    slug: slug || activeOrgId,
                    image_url: image_url || "",
                    ownerId: userId // initial creator from our app perspective
                }
            });
        } else if (!workspace) {
            return res.status(404).json({ message: "Workspace not found and no info provided to create it" });
        }

        const isOwner = workspace.ownerId === userId;
        const role = isOwner ? "ADMIN" : "MEMBER";

        await prisma.workspaceMember.upsert({
            where: { userId_workspaceId: { userId, workspaceId: activeOrgId } },
            update: { role },
            create: { userId, workspaceId: activeOrgId, role }
        });

        const ws = await prisma.workspace.findUnique({
            where: { id: activeOrgId },
            include:{
                members: {include : {user : true}},
                projects:{
                    include:{
                        tasks:{include:{assignee:true, comments:{include:{user:true}}}},
                        members:{ include : { user : true}}
                    }
                },
                owner : true
            }
        });
        res.json({ workspace: ws, message: "Membership synced" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}
// Add Members to Workspace
export const addMember = async(req, res)=>{
    try{
        const {userId} = req.auth;
        const{email, role , workspaceId , message} = req.body;

        //checking if user exists . 
        const user = await prisma.user.findUnique({where:{email}});

        if(!user){
            // User isn't in our DB yet. We can't add to WorkspaceMember, but we CAN send a Clerk invite!
            try {
                await clerk.organizations.createOrganizationInvitation({
                    organizationId: workspaceId,
                    emailAddress: email,
                    role: role === "ADMIN" ? "org:admin" : "org:member"
                });
                return res.json({ message: "User not in system yet, but invitation sent successfully!" });
            } catch (clerkError) {
                console.error("Clerk Backend Invitation error for new user:", clerkError.message);
                return res.status(404).json({ message: "User not found and failed to send Clerk invite." });
            }
        }

        if(!workspaceId || !role){
            return res.status(400).json("Missing required fields")

        }

        if(!["ADMIN","MEMBER"].includes(role)){
            return res.status(400).json("Invalid role")
        }

    //Fetch Workspace
    const workspace = await prisma.workspace.findUnique({where:{id:workspaceId}, include:{members:true}})

    if(!workspace){
         return res.status(404).json("Workspace not found")
    }

    //check if creator has the admin role - REMOVED so anyone can invite
    // if(!workspace.members.find((member)=>member.userId === userId && member.role==="ADMIN")){
    //     return res.status(401).json({message: "You do not have the Admin Privileges"})
    // }

    //Check if user is alredy a member
    const existingMember = workspace.members.find((member)=>member.userId===user.id);

    if(existingMember){
        return res.status(400).json("User is already a member")

    }

    const member =  await prisma.workspaceMember.create({
        data:{
            userId:user.id,
            workspaceId,
            role,
            message
        }
    })
    
    try {
        await clerk.organizations.createOrganizationInvitation({
            organizationId: workspaceId,
            emailAddress: email,
            role: role === "ADMIN" ? "org:admin" : "org:member"
        });
    } catch (clerkError) {
        console.error("Clerk Backend Invitation error:", clerkError.message);
        // Continue even if Clerk invitation fails (user might already be invited)
    }

    res.json({member,message:"Member added successfully"});
    }catch(error){
        console.log(error)
        res.status(500).json({message: error.code || error.message})
    }
}

// Delete Workspace
export const deleteWorkspace = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { id } = req.params;

        const workspace = await prisma.workspace.findUnique({
            where: { id },
            include: { members: true }
        });

        if (!workspace) return res.status(404).json({ message: "Workspace not found" });

        // Only ADMIN/Owner can delete
        const member = workspace.members.find(m => m.userId === userId);
        const isOwner = workspace.ownerId === userId;
        const isAdmin = member?.role === "ADMIN";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "You don't have permission to delete this workspace" });
        }

        // 1. Delete from Clerk first (so it's gone from UI immediately)
        try {
            await clerk.organizations.deleteOrganization(id);
        } catch (clerkError) {
            console.error("Clerk deletion error:", clerkError.message);
            // Even if Clerk fails (e.g. org already deleted manually), we proceed to clean DB
        }

        // 2. Manual cleanup of dependencies if Cascade is not enough or to be safe
        // Prisma Cascade in schema should handle this, but let's be robust
        await prisma.$transaction([
            prisma.comment.deleteMany({ where: { task: { project: { workspaceId: id } } } }),
            prisma.task.deleteMany({ where: { project: { workspaceId: id } } }),
            prisma.projectMember.deleteMany({ where: { project: { workspaceId: id } } }),
            prisma.project.deleteMany({ where: { workspaceId: id } }),
            prisma.workspaceMember.deleteMany({ where: { workspaceId: id } }),
            prisma.workspace.delete({ where: { id } })
        ]);

        res.json({ message: "Workspace and all related data deleted successfully" });
    } catch (error) {
        console.error("Delete workspace error:", error);
        res.status(500).json({ message: error.code || error.message });
    }
}
