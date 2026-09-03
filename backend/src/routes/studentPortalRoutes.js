import express from "express";
import { getMyDashboard, getMyCourses, getCourseDetails, getCourseVideos, changePassword } from "../controllers/studentPortalController.js";
import { verifyStudent } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyStudent);

router.get("/dashboard", getMyDashboard);
router.get("/courses", getMyCourses);
router.get("/courses/:courseId", getCourseDetails);
router.get("/courses/:courseId/videos", getCourseVideos);
router.put("/password", changePassword);

export default router;
