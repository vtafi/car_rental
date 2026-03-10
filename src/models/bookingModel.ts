import mongoose, { Document, Schema } from "mongoose";

export interface IBooking extends Document {
  customerName: string;
  carNumber: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  status: "pending" | "picked_up" | "returned" | "cancelled";
  pickup_at?: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    carNumber: {
      type: String,
      required: [true, "Car number is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "picked_up", "returned", "cancelled"],
      default: "pending",
    },
    pickup_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
