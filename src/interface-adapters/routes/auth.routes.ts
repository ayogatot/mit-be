import { Hono } from "hono";
import type { Context, Next } from "hono";
import { AuthController } from "../controllers/AuthController";

const authRoutes = new Hono();
const authController = new AuthController();

const authAttempts = new Map<string, { count: number; resetAt: number }>();

const rateLimitAuth = async (c: Context, next: Next) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
    c.req.header("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;

  const existing = authAttempts.get(ip);
  if (!existing || now > existing.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + windowMs });
  } else if (existing.count >= maxAttempts) {
    return c.json({ ok: false, message: "Too many requests, please try again later" }, 429);
  } else {
    existing.count++;
  }
  return next();
};

authRoutes.post("/register", rateLimitAuth, (c) => authController.register(c));
authRoutes.post("/login", rateLimitAuth, (c) => authController.login(c));
authRoutes.post("/refresh", rateLimitAuth, (c) => authController.refresh(c));
authRoutes.post("/google", rateLimitAuth, (c) => authController.loginWithGoogle(c));
authRoutes.post("/facebook", rateLimitAuth, (c) => authController.loginWithFacebook(c));

export default authRoutes;
