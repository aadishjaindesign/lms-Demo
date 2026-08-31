import mongoose from "mongoose";

const CourseAccessSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

CourseAccessSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export default mongoose.models.CourseAccess || mongoose.model("CourseAccess", CourseAccessSchema);
