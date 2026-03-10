import { Router } from "express";
import {
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  pickupCar,
} from "../controllers/bookingController";

const router = Router();

router.get("/", getBookings);
router.post("/", createBooking);
router.put("/:bookingId", updateBooking);
router.delete("/:bookingId", deleteBooking);
router.patch("/:bookingId/pickup", pickupCar);

export default router;
