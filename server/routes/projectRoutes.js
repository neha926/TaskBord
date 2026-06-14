import express from 'express';
import { addMember, createProject, updateProject, listProjects } from '../controllers/projectController.js';

const projectRouter=express.Router();

projectRouter.get('/', listProjects)
projectRouter.post('/',createProject)
projectRouter.put('/',updateProject)
projectRouter.post('/:projectId/addMember',addMember)

export default projectRouter
