import mongoose, { Document, Schema } from "mongoose";

export interface ICar extends Document {
  carNumber: string;
  capacity: number;
  status: "available" | "rented" | "maintenance";
  pricePerDay: number;
  features: string[];
}

const CarSchema = new Schema<ICar>(
  {
    carNumber: {
      type: String,
      required: [true, "Car number is required"],
      unique: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    status: {
      type: String,
      enum: ["available", "rented", "maintenance"],
      default: "available",
    },
    pricePerDay: {
      type: Number,
      required: [true, "Price per day is required"],
      min: [0, "Price must be non-negative"],
    },
    features: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

export const Car = mongoose.model<ICar>("Car", CarSchema);
