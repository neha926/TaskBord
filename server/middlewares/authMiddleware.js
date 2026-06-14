
import { clerk } from "../server.js";
import prisma from "../configs/prisma.js";

export const protect = async (req, res, next)=>{
    try{
        if(!process.env.CLERK_SECRET_KEY){
            return res.status(500).json({message:"Server misconfigured: CLERK_SECRET_KEY missing"});
        }

        const {userId} =  req.auth;

        if(!userId){
            return res.status(401).json({message:"Unauthorized: invalid or missing Clerk token"})
        }

        // Robust User Sync: Ensure user exists in DB before proceeding to any controller
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            try {
                const clerkUser = await clerk.users.getUser(userId);
                user = await prisma.user.upsert({
                    where: { id: userId },
                    update: {},
                    create: {
                        id: userId,
                        email: clerkUser.emailAddresses[0].emailAddress,
                        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
                        image: clerkUser.imageUrl || ""
                    }
                });
            } catch (clerkErr) {
                console.error("AuthMiddleware: Failed to sync user from Clerk:", clerkErr.message);
                return res.status(401).json({ message: "User sync failed. Please re-login." });
            }
        }

        return next()

    }catch(error){
        console.log(error);
        res.status(401).json({message: error.code|| error.message});
    }
}
