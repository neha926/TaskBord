import express from"express";
import { addMember, deleteWorkspace, getUserWorkspaces, syncActiveMembership } from "../controllers/workspaceController.js";

const workspaceRouter = express.Router();

workspaceRouter.get('/',getUserWorkspaces)
workspaceRouter.post('/add-member',addMember)
workspaceRouter.post('/sync-active',syncActiveMembership)
workspaceRouter.delete('/:id', deleteWorkspace)

export default workspaceRouter 
