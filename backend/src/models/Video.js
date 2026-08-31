import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    publicId: {
      type: String,
      required: true,
    },
    secureUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      default: 0,
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

export default mongoose.models.Video || mongoose.model("Video", VideoSchema);
