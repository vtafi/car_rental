import { Router, Request, Response } from "express";
import { Car } from "../models/carModel";
import { Booking } from "../models/bookingModel";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

// All view routes require authentication
router.use(requireAuth);

// ─── DASHBOARD ───────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const [cars, bookings] = await Promise.all([
      Car.find(),
      Booking.find().sort({ createdAt: -1 }),
    ]);

    const stats = {
      totalCars: cars.length,
      availableCars: cars.filter((c) => c.status === "available").length,
      rentedCars: cars.filter((c) => c.status === "rented").length,
      totalBookings: bookings.length,
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
      totalRevenue: bookings.reduce((sum, b) => sum + b.totalAmount, 0),
    };

    res.render("index", {
      title: "Dashboard",
      path: "/",
      user: req.user,
      stats,
      recentBookings: bookings.slice(0, 8),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send(`<pre>Error: ${message}</pre>`);
  }
});

// ─── CARS ────────────────────────────────────────────────────
router.get("/cars", async (req: Request, res: Response) => {
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    const flash = req.query as Record<string, string>;
    res.render("cars/index", {
      title: "Quản lý xe",
      path: "/cars",
      user: req.user,
      cars,
      message: flash.msg || null,
      messageType: flash.type || "info",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send(`<pre>Error: ${message}</pre>`);
  }
});

router.get("/cars/new", (req: Request, res: Response) => {
  res.render("cars/form", {
    title: "Thêm xe mới",
    path: "/cars",
    user: req.user,
    car: null,
    error: null,
  });
});

router.post("/cars", async (req: Request, res: Response) => {
  try {
    const { carNumber, capacity, status, pricePerDay, features } = req.body as {
      carNumber: string;
      capacity: string;
      status?: string;
      pricePerDay: string;
      features?: string;
    };

    const featuresArray = features
      ? features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
      : [];

    const car = new Car({
      carNumber: carNumber.trim(),
      capacity: parseInt(capacity),
      status: status || "available",
      pricePerDay: parseFloat(pricePerDay),
      features: featuresArray,
    });
    await car.save();
    res.redirect("/cars?msg=Thêm xe thành công!&type=success");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.render("cars/form", {
      title: "Thêm xe mới",
      path: "/cars",
      car: null,
      error: message,
    });
  }
});

router.get("/cars/:id/edit", async (req: Request, res: Response) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.redirect("/cars?msg=Không tìm thấy xe&type=error");
      return;
    }
    res.render("cars/form", {
      title: "Sửa xe",
      path: "/cars",
      user: req.user,
      car,
      error: null,
    });
  } catch {
    res.redirect("/cars?msg=Lỗi hệ thống&type=error");
  }
});

router.post("/cars/:id/update", async (req: Request, res: Response) => {
  try {
    const { carNumber, capacity, status, pricePerDay, features } = req.body as {
      carNumber: string;
      capacity: string;
      status?: string;
      pricePerDay: string;
      features?: string;
    };
    const featuresArray = features
      ? features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
      : [];

    const car = await Car.findByIdAndUpdate(
      req.params.id,
      {
        carNumber: carNumber.trim(),
        capacity: parseInt(capacity),
        status,
        pricePerDay: parseFloat(pricePerDay),
        features: featuresArray,
      },
      { new: true, runValidators: true },
    );
    if (!car) {
      res.redirect("/cars?msg=Không tìm thấy xe&type=error");
      return;
    }
    res.redirect("/cars?msg=Cập nhật xe thành công!&type=success");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const car = await Car.findById(req.params.id).catch(() => null);
    res.render("cars/form", {
      title: "Sửa xe",
      path: "/cars",
      car,
      error: message,
    });
  }
});

router.post("/cars/:id/delete", async (req: Request, res: Response) => {
  try {
    await Car.findByIdAndDelete(req.params.id);
    res.redirect("/cars?msg=Xoá xe thành công!&type=success");
  } catch {
    res.redirect("/cars?msg=Lỗi khi xoá xe&type=error");
  }
});

// ─── BOOKINGS ────────────────────────────────────────────────
router.get("/bookings", async (req: Request, res: Response) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    const flash = req.query as Record<string, string>;
    res.render("bookings/index", {
      title: "Đặt xe",
      path: "/bookings",
      user: req.user,
      bookings,
      message: flash.msg || null,
      messageType: flash.type || "info",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send(`<pre>Error: ${message}</pre>`);
  }
});

router.get("/bookings/new", async (req: Request, res: Response) => {
  const cars = await Car.find().sort({ carNumber: 1 });
  res.render("bookings/form", {
    title: "Tạo đặt xe",
    path: "/bookings",
    user: req.user,
    booking: null,
    cars,
    error: null,
  });
});

router.post("/bookings", async (req: Request, res: Response) => {
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
      const cars = await Car.find();
      res.render("bookings/form", {
        title: "Tạo đặt xe",
        path: "/bookings",
        booking: null,
        cars,
        error: "Ngày không hợp lệ",
      });
      return;
    }
    if (start >= end) {
      const cars = await Car.find();
      res.render("bookings/form", {
        title: "Tạo đặt xe",
        path: "/bookings",
        booking: null,
        cars,
        error: "Ngày bắt đầu phải trước ngày kết thúc",
      });
      return;
    }

    const car = await Car.findOne({ carNumber });
    if (!car) {
      const cars = await Car.find();
      res.render("bookings/form", {
        title: "Tạo đặt xe",
        path: "/bookings",
        booking: null,
        cars,
        error: `Không tìm thấy xe: ${carNumber}`,
      });
      return;
    }

    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalAmount = days * car.pricePerDay;

    const booking = new Booking({
      customerName,
      carNumber,
      startDate: start,
      endDate: end,
      totalAmount,
    });
    await booking.save();
    await Car.findOneAndUpdate({ carNumber }, { status: "rented" });

    res.redirect("/bookings?msg=Tạo đặt xe thành công!&type=success");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const cars = await Car.find();
    res.render("bookings/form", {
      title: "Tạo đặt xe",
      path: "/bookings",
      booking: null,
      cars,
      error: message,
    });
  }
});

router.get("/bookings/:id/edit", async (req: Request, res: Response) => {
  try {
    const [booking, cars] = await Promise.all([
      Booking.findById(req.params.id),
      Car.find().sort({ carNumber: 1 }),
    ]);
    if (!booking) {
      res.redirect("/bookings?msg=Không tìm thấy đặt xe&type=error");
      return;
    }
    res.render("bookings/form", {
      title: "Sửa đặt xe",
      path: "/bookings",
      user: req.user,
      booking,
      cars,
      error: null,
    });
  } catch {
    res.redirect("/bookings?msg=Lỗi hệ thống&type=error");
  }
});

router.post("/bookings/:id/update", async (req: Request, res: Response) => {
  try {
    const { customerName, carNumber, startDate, endDate } = req.body as {
      customerName: string;
      carNumber: string;
      startDate: string;
      endDate: string;
    };
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      const [booking, cars] = await Promise.all([
        Booking.findById(req.params.id),
        Car.find(),
      ]);
      res.render("bookings/form", {
        title: "Sửa đặt xe",
        path: "/bookings",
        booking,
        cars,
        error: "Ngày bắt đầu phải trước ngày kết thúc",
      });
      return;
    }
    const car = await Car.findOne({ carNumber });
    if (!car) {
      res.redirect(`/bookings?msg=Không tìm thấy xe ${carNumber}&type=error`);
      return;
    }

    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalAmount = days * car.pricePerDay;

    await Booking.findByIdAndUpdate(
      req.params.id,
      { customerName, carNumber, startDate: start, endDate: end, totalAmount },
      { new: true, runValidators: true },
    );
    res.redirect("/bookings?msg=Cập nhật thành công!&type=success");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const [booking, cars] = await Promise.all([
      Booking.findById(req.params.id).catch(() => null),
      Car.find(),
    ]);
    res.render("bookings/form", {
      title: "Sửa đặt xe",
      path: "/bookings",
      booking,
      cars,
      error: message,
    });
  }
});

router.post("/bookings/:id/pickup", async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.redirect("/bookings?msg=Không tìm thấy đặt xe&type=error");
      return;
    }
    if (booking.status !== "pending") {
      res.redirect(
        `/bookings?msg=Booking đang ở trạng thái "${booking.status}"&type=error`,
      );
      return;
    }
    const now = new Date();
    if (now < booking.startDate) {
      res.redirect(
        `/bookings?msg=Chưa đến ngày nhận xe (${booking.startDate.toLocaleDateString("vi-VN")})&type=error`,
      );
      return;
    }
    await Booking.findByIdAndUpdate(req.params.id, {
      status: "picked_up",
      pickup_at: now,
    });
    res.redirect("/bookings?msg=Nhận xe thành công!&type=success");
  } catch {
    res.redirect("/bookings?msg=Lỗi hệ thống&type=error");
  }
});

router.post("/bookings/:id/delete", async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (booking) {
      const other = await Booking.findOne({
        carNumber: booking.carNumber,
        endDate: { $gte: new Date() },
      });
      if (!other)
        await Car.findOneAndUpdate(
          { carNumber: booking.carNumber },
          { status: "available" },
        );
    }
    res.redirect("/bookings?msg=Xoá đặt xe thành công!&type=success");
  } catch {
    res.redirect("/bookings?msg=Lỗi khi xoá&type=error");
  }
});

export default router;
