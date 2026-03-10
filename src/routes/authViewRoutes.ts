import { Router, Request, Response } from "express";
import { User } from "../models/userModel";
import {
  generateToken,
  COOKIE_OPTIONS,
  JwtPayload,
} from "../middleware/authMiddleware";

const router = Router();

// GET /login
router.get("/login", (req: Request, res: Response) => {
  const { redirect, msg } = req.query as Record<string, string>;
  res.render("auth/login", {
    title: "Đăng nhập",
    error: null,
    success: msg || null,
    redirect: redirect || null,
    prefill: null,
  });
});

// POST /auth/login
router.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password, redirect } = req.body as {
    username: string;
    password: string;
    redirect?: string;
  };

  try {
    const user = await User.findOne({
      username: username?.toLowerCase().trim(),
    });
    if (!user || !(await user.comparePassword(password))) {
      res.render("auth/login", {
        title: "Đăng nhập",
        error: "Tên đăng nhập hoặc mật khẩu không đúng",
        success: null,
        redirect: redirect || null,
        prefill: username,
      });
      return;
    }

    const payload: JwtPayload = {
      userId: (user._id as string).toString(),
      username: user.username,
      role: user.role,
    };
    const token = generateToken(payload);
    res.cookie("token", token, COOKIE_OPTIONS);

    // Redirect to original URL or dashboard
    const dest = redirect && redirect.startsWith("/") ? redirect : "/";
    res.redirect(dest);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống";
    res.render("auth/login", {
      title: "Đăng nhập",
      error: message,
      success: null,
      redirect: redirect || null,
      prefill: username,
    });
  }
});

// GET /register
router.get("/register", (_req: Request, res: Response) => {
  res.render("auth/register", { title: "Đăng ký", error: null, prefill: null });
});

// POST /auth/register
router.post("/auth/register", async (req: Request, res: Response) => {
  const { username, password, role } = req.body as {
    username: string;
    password: string;
    role?: string;
  };

  try {
    const existing = await User.findOne({
      username: username?.toLowerCase().trim(),
    });
    if (existing) {
      res.render("auth/register", {
        title: "Đăng ký",
        error: "Username đã tồn tại",
        prefill: username,
      });
      return;
    }

    const user = new User({
      username: username.trim(),
      password,
      role: role === "admin" ? "admin" : "staff",
    });
    await user.save();

    res.redirect("/login?msg=Đăng ký thành công! Vui lòng đăng nhập.");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống";
    res.render("auth/register", {
      title: "Đăng ký",
      error: message,
      prefill: username,
    });
  }
});

// POST /auth/logout
router.post("/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
  res.redirect("/login?msg=Đã đăng xuất thành công!");
});

export default router;
