import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import { Booking, IBooking } from "../models/bookingModel";
import { Car } from "../models/carModel";

const calculateDays = (start: Date, end: Date): number =>
  Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

// GET /api/bookings
export const getBookings = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, message });
  }
};

// POST /api/bookings
export const createBooking = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { customerName, carNumber, startDate, endDate } = req.body as {
      customerName: string;
      carNumber: string;
      startDate: string;
      endDate: string;
    };

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, message: "Ngày không hợp lệ" });
      return;
    }
    if (start >= end) {
      res.status(400).json({
        success: false,
        message: "Ngày bắt đầu phải trước ngày kết thúc",
      });
      return;
    }

    const car = await Car.findOne({ carNumber });
    if (!car) {
      res
        .status(404)
        .json({ success: false, message: `Không tìm thấy xe: ${carNumber}` });
      return;
    }
    if (car.status === "maintenance") {
      res
        .status(400)
        .json({ success: false, message: "Xe đang bảo trì, không thể đặt" });
      return;
    }

    // Overlap check
    const overlapFilter: FilterQuery<IBooking> = {
      carNumber,
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }],
    };
    const overlap = await Booking.findOne(overlapFilter);
    if (overlap) {
      res.status(409).json({
        success: false,
        message: `Xe ${carNumber} đã được đặt từ ${overlap.startDate.toLocaleDateString("vi-VN")} đến ${overlap.endDate.toLocaleDateString("vi-VN")}`,
      });
      return;
    }

    const totalAmount = calculateDays(start, end) * car.pricePerDay;
    const booking = new Booking({
      customerName,
      carNumber,
      startDate: start,
      endDate: end,
      totalAmount,
    });
    await booking.save();

    // Update car status
    await Car.findOneAndUpdate({ carNumber }, { status: "rented" });

    res.status(201).json({ success: true, data: booking });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, message });
  }
};

// PUT /api/bookings/:bookingId
export const updateBooking = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { customerName, carNumber, startDate, endDate } = req.body as {
      customerName: string;
      carNumber: string;
      startDate: string;
      endDate: string;
    };

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      res.status(400).json({
        success: false,
        message: "Ngày bắt đầu phải trước ngày kết thúc",
      });
      return;
    }

    const car = await Car.findOne({ carNumber });
    if (!car) {
      res
        .status(404)
        .json({ success: false, message: `Không tìm thấy xe: ${carNumber}` });
      return;
    }

    const overlapFilter: FilterQuery<IBooking> = {
      _id: { $ne: bookingId },
      carNumber,
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }],
    };
    const overlap = await Booking.findOne(overlapFilter);
    if (overlap) {
      res.status(409).json({
        success: false,
        message: `Xe ${carNumber} đã được đặt trong khoảng thời gian này.`,
      });
      return;
    }

    const totalAmount = calculateDays(start, end) * car.pricePerDay;
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { customerName, carNumber, startDate: start, endDate: end, totalAmount },
      { new: true, runValidators: true },
    );

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }
    res.json({ success: true, data: booking });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ success: false, message });
  }
};

// PATCH /api/bookings/:bookingId/pickup
export const pickupCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    console.log(bookingId);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });
      return;
    }

    if (booking.status !== "pending") {
      res.status(400).json({
        success: false,
        message: `Booking đang ở trạng thái "${booking.status}", không thể nhận xe`,
      });
      return;
    }

    const now = new Date();
    if (now < booking.startDate) {
      res.status(400).json({
        success: false,
        message: `Chưa đến ngày nhận xe. Ngày nhận xe sớm nhất là ${booking.startDate.toLocaleDateString("vi-VN")}`,
      });
      return;
    }

    booking.status = "picked_up";
    booking.pickup_at = now;
    await Booking.findByIdAndUpdate(
      bookingId,
      { status: "picked_up", pickup_at: now },
      { new: true },
    );

    res.json({ success: true, message: "Nhận xe thành công", data: booking });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, message });
  }
};

export const deleteBooking = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findByIdAndDelete(bookingId);
    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    // Free car if no other active bookings
    const otherBooking = await Booking.findOne({
      carNumber: booking.carNumber,
      endDate: { $gte: new Date() },
    });
    if (!otherBooking) {
      await Car.findOneAndUpdate(
        { carNumber: booking.carNumber },
        { status: "available" },
      );
    }

    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ success: false, message });
  }
};
