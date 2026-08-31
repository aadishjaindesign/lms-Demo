import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
      maxlength: [100, "Course name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
