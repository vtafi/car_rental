import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  username: string;
  role: "admin" | "staff";
}

// Extend Express Request to carry user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "car_rental_secret_change_in_prod";

// ── Core verification ─────────────────────────────────────────
function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ── API middleware: expects Bearer token in Authorization header
// Also accepts cookie (for flexibility)
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
      return next();
    }
    res
      .status(401)
      .json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
    return;
  }

  // 2. Fallback: cookie
  const cookieToken = req.cookies?.token as string | undefined;
  if (cookieToken) {
    const payload = verifyToken(cookieToken);
    if (payload) {
      req.user = payload;
      return next();
    }
  }

  res
    .status(401)
    .json({ success: false, message: "Chưa xác thực. Vui lòng đăng nhập" });
};

// ── View middleware: redirects to /login instead of JSON 401 ──
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const cookieToken = req.cookies?.token as string | undefined;
  if (cookieToken) {
    const payload = verifyToken(cookieToken);
    if (payload) {
      req.user = payload;
      return next();
    }
  }
  res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
};

// ── Role guard ─────────────────────────────────────────────────
export const requireRole =
  (...roles: Array<"admin" | "staff">) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json({ success: false, message: "Không có quyền truy cập" });
      return;
    }
    next();
  };

// ── JWT helpers ────────────────────────────────────────────────
export const generateToken = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  secure: process.env.NODE_ENV === "production",
};
