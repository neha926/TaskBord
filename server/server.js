import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"
import workspaceRouter from './routes/workspaceRoute.js';
import { protect } from './middlewares/authMiddleware.js';
import projectRouter from './routes/projectRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';


// create app
const app=express()

app.use(express.json())
app.use(cors())
app.use(clerkMiddleware())

// home route
app.get('/',(req,res)=>res.send('server is live!!!'))

app.use("/api/inngest", serve({ client: inngest, functions }));

// Routes
app.use("/api/workspaces", protect, workspaceRouter)
// to protect the route make middleware
app.use("/api/projects", protect, projectRouter)
app.use("/api/tasks", protect, taskRouter)
app.use("/api/comments", protect, commentRouter)

// add port : to run the app
const PORT=process.env.PORT||5000

app.listen(PORT,()=>console.log(`server is running on port ${PORT}`))