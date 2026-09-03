import express from "express";
import { getDashboardStats, changeAdminPassword } from "../controllers/adminController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected admin routes
router.get("/dashboard-stats", verifyAdmin, getDashboardStats);
router.put("/change-password", verifyAdmin, changeAdminPassword);

export default router;
