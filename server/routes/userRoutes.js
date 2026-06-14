import express from "express";
import { getProfile, updateProfile, getEmployeePerformance, getUserAnalytics, generatePortfolioQuestions, parsePortfolioResponse } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/profile", getProfile);
userRouter.put("/profile", updateProfile);
userRouter.get("/performance/:employeeId", getEmployeePerformance);
userRouter.get("/analytics", getUserAnalytics);
userRouter.get("/onboarding/questions", generatePortfolioQuestions);
userRouter.post("/onboarding/parse", parsePortfolioResponse);

export default userRouter;
