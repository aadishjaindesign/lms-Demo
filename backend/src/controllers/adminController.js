import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Video from "../models/Video.js";
import CourseAccess from "../models/CourseAccess.js";

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    // Use the start of the current day for expiry comparison to match CourseAccess logic
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalStudents,
      activeStudents,
      blockedStudents,
      totalCourses,
      activeCourses,
      totalVideos,
      activeCourseAccess,
      expiredCourseAccess
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: "active" }),
      Student.countDocuments({ status: "blocked" }),
      Course.countDocuments(),
      Course.countDocuments({ status: "active" }),
      Video.countDocuments(),
      CourseAccess.countDocuments({ 
        status: "active", 
        expiryDate: { $gte: startOfToday } 
      }),
      CourseAccess.countDocuments({ 
        status: "active", 
        expiryDate: { $lt: startOfToday } 
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        students: {
          total: totalStudents,
          active: activeStudents,
          blocked: blockedStudents,
        },
        courses: {
          total: totalCourses,
          active: activeCourses,
        },
        videos: {
          total: totalVideos,
        },
        courseAccess: {
          active: activeCourseAccess,
          expired: expiredCourseAccess,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ success: false, message: "Server Error: Could not fetch dashboard statistics" });
  }
};

export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const adminId = req.user.userId;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "New passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" }); // 400 is fine, or 401. Project uses 400 for validation errors. Wait, studentLogin uses 401 for 'Invalid credentials'.
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password cannot be the same as the current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing admin password:", error);
    res.status(500).json({ success: false, message: "Server Error: Could not change password" });
  }
};
