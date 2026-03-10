import { Request, Response } from "express";
import { User } from "../models/userModel";
import {
  generateToken,
  COOKIE_OPTIONS,
  JwtPayload,
} from "../middleware/authMiddleware";

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, role } = req.body as {
      username: string;
      password: string;
      role?: "admin" | "staff";
    };

    if (!username || !password) {
      res
        .status(400)
        .json({ success: false, message: "Username và password là bắt buộc" });
      return;
    }

    const existing = await User.findOne({
      username: username.toLowerCase().trim(),
    });
    if (existing) {
      res.status(409).json({ success: false, message: "Username đã tồn tại" });
      return;
    }

    const user = new User({
      username: username.trim(),
      password,
      role: role || "staff",
    });
    await user.save();

    const payload: JwtPayload = {
      userId: (user._id as string).toString(),
      username: user.username,
      role: user.role,
    };
    const token = generateToken(payload);

    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ success: false, message });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body as {
      username: string;
      password: string;
    };

    if (!username || !password) {
      res
        .status(400)
        .json({ success: false, message: "Username và password là bắt buộc" });
      return;
    }

    const user = await User.findOne({
      username: username.toLowerCase().trim(),
    });
    if (!user) {
      res
        .status(401)
        .json({
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không đúng",
        });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res
        .status(401)
        .json({
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không đúng",
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
    res.json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, message });
  }
};

// POST /api/auth/logout
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
  res.json({ success: true, message: "Đã đăng xuất" });
};

// GET /api/auth/me
export const getMe = (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Chưa xác thực" });
    return;
  }
  res.json({ success: true, user: req.user });
};
