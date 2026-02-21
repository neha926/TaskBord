import prisma from "../configs/prisma.js"

export const getUserWorkspaces = async (req , res) => {
    try{
        const {userId} =await req.auth();
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

// Add Members to Workspace
export const addMember = async(req, res)=>{
    try{
        const {userId} =await req.auth();
        const{email, role , workspaceId , message} = req.body;

        //checking if user exists . 
        const user = await prisma.user.findUnique({where:{email}});

        if(!user){
            return res.status(404).json("User not found")
        }

        if(!workspaceId || !role){
            return res.status(400).json("Missign required fields")

        }

        if(!["ADMIN","MEMBERS"].includes(role)){
            return res.status(400).json("Invalid Role")
        }

    //Fetch Workspace
    const workspace = await prisma.workspace.findUnique({where:{id:workspaceId}, include:{members:true}})

    if(!workspace){
         return res.status(404).json("Workspace not found")
    }

    //check if creator has the admin role
    if(!workspace.members.find((member)=>member.userId === userId && member.role==="ADMIN")){
        return res.status(401).json({message: "You do not have the Admin Privileges"})
    }

    //Check if user is alredy a member
    const existingMember = workspace.members.find((member)=>member.userId===userId);

    if(existingMember){
        return res.status(400).json("You are already a Member")

    }

    const member =  await prisma.workspaceMember.create({
        data:{
            userId:user.id,
            workspaceId,
            role,
            message
        }
    })
    res.json({member,message:"Member added successfully"});
    }catch(error){
        console.log(error)
        res.status(500).json({message: error.code || error.message})
    }
}