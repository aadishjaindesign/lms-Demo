import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // E.g., 'STU-AV'
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

export default mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
