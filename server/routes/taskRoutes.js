import express from "express"
import { createTask, deleteTask, updateTask } from "../controllers/taskController.js";

const taskRouter = express.Router();

taskRouter.post('/', createTask )
taskRouter.put('/:id', updateTask )
taskRouter.delete('/:id', deleteTask)
taskRouter.post('/delete', deleteTask) // Support bulk delete via POST as well

export default taskRouter;