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
      required: false, // Changed for R2 support
    },
    secureUrl: {
      type: String,
      required: false, // Changed for R2 support
    },
    storageProvider: {
      type: String,
      enum: ["cloudinary", "r2"],
      default: "cloudinary",
    },
    objectKey: {
      type: String,
    },
    originalName: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number,
    },
    expiresAt: {
      type: Date,
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
    processingStatus: {
      type: String,
      enum: ["none", "pending", "processing", "ready", "failed"],
      default: "none",
    },
    hlsReady: {
      type: Boolean,
      default: false,
    },
    hlsMasterPlaylist: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

VideoSchema.index({ expiresAt: 1 });

export default mongoose.models.Video || mongoose.model("Video", VideoSchema);
