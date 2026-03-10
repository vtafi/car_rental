import { Request, Response } from "express";
import { Car } from "../models/carModel";

// GET /api/cars
export const getCars = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    res.json({ success: true, data: cars });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, message });
  }
};

// POST /api/cars
export const createCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { carNumber, capacity, status, pricePerDay, features } = req.body as {
      carNumber: string;
      capacity: number;
      status?: string;
      pricePerDay: number;
      features?: string | string[];
    };

    const featuresArray: string[] = Array.isArray(features)
      ? features
      : typeof features === "string"
        ? features
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : [];

    const car = new Car({
      carNumber,
      capacity,
      status,
      pricePerDay,
      features: featuresArray,
    });
    await car.save();
    res.status(201).json({ success: true, data: car });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ success: false, message });
  }
};

// PUT /api/cars/:id
export const updateCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { carNumber, capacity, status, pricePerDay, features } = req.body as {
      carNumber: string;
      capacity: number;
      status?: string;
      pricePerDay: number;
      features?: string | string[];
    };

    const featuresArray: string[] = Array.isArray(features)
      ? features
      : typeof features === "string"
        ? features
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : [];

    const car = await Car.findByIdAndUpdate(
      id,
      { carNumber, capacity, status, pricePerDay, features: featuresArray },
      { new: true, runValidators: true },
    );

    if (!car) {
      res.status(404).json({ success: false, message: "Car not found" });
      return;
    }
    res.json({ success: true, data: car });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ success: false, message });
  }
};

// DELETE /api/cars/:id
export const deleteCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const car = await Car.findByIdAndDelete(id);
    if (!car) {
      res.status(404).json({ success: false, message: "Car not found" });
      return;
    }
    res.json({ success: true, message: "Car deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ success: false, message });
  }
};
