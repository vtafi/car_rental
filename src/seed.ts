import mongoose from "mongoose";
import dotenv from "dotenv";
import { Car } from "./models/carModel";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/carRental";

const seedCars = [
  {
    carNumber: "43A-123.45",
    capacity: 4,
    status: "available",
    pricePerDay: 500000,
    features: ["Điều hòa", "Bluetooth", "Bản đồ"],
  },
  {
    carNumber: "43B-678.90",
    capacity: 7,
    status: "available",
    pricePerDay: 800000,
    features: ["Camera lùi", "Cửa sổ trời", "Ghế da"],
  },
  {
    carNumber: "43A-555.55",
    capacity: 4,
    status: "rented",
    pricePerDay: 600000,
    features: ["Số tự động", "Cảm biến va chạm"],
  },
  {
    carNumber: "43C-111.22",
    capacity: 2,
    status: "maintenance",
    pricePerDay: 450000,
    features: ["Tiết kiệm xăng", "Android Auto"],
  },
  {
    carNumber: "92A-888.88",
    capacity: 16,
    status: "available",
    pricePerDay: 1500000,
    features: ["Tủ lạnh mini", "Wifi", "Ghế massage"],
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB:", MONGO_URI);

    // Xóa data cũ trước khi seed
    await Car.deleteMany({});
    console.log("🗑️  Cleared existing cars");

    const inserted = await Car.insertMany(seedCars);
    console.log(`🌱 Seeded ${inserted.length} cars:`);
    inserted.forEach((c) => console.log(`   ✔ ${c.carNumber} — ${c.status}`));
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seed();
