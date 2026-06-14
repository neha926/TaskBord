import express from "express";
import { getSmartAgenda, getCommentSummary, suggestComplexity } from "../controllers/aiController.js";

const router = express.Router();

router.get("/smart-agenda", getSmartAgenda);
router.get("/comment-summary/:taskId", getCommentSummary);
router.post("/suggest-complexity", suggestComplexity);

export default router;
