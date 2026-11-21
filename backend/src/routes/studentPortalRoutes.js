import express from "express";
import { getMyDashboard, getMyCourses, getCourseDetails, getCourseVideos, reportVideoDuration, changePassword, getMyFees, getBridgeDiagnostic } from "../controllers/studentPortalController.js";
import { getStudentAttendance, punchAttendance, getStudentGeofence } from "../controllers/attendanceController.js";
import { verifyStudent } from "../middleware/authMiddleware.js";

const router = express.Router();

// Diagnostic endpoint before strict auth check (or can also be accessed with auth)
router.get("/bridge-status", getBridgeDiagnostic);

router.use(verifyStudent);

router.get("/dashboard", getMyDashboard);
router.get("/courses", getMyCourses);
router.get("/courses/:courseId", getCourseDetails);
router.get("/courses/:courseId/videos", getCourseVideos);
router.post("/courses/:courseId/videos/:videoId/duration", reportVideoDuration);
router.get("/attendance", getStudentAttendance);
router.post("/attendance/punch", punchAttendance);
router.get("/attendance/geofence", getStudentGeofence);
router.get("/fees", getMyFees);
router.put("/password", changePassword);

export default router;
