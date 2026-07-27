import { Context } from "hono";
import { z } from "zod";
import { sign, verify } from "jsonwebtoken";
import { RegisterUserUseCase } from "../../use-cases/auth/RegisterUser";
import { LoginUserUseCase } from "../../use-cases/auth/LoginUser";
import { DrizzleUserRepository } from "../../infrastructure/repositories/DrizzleUserRepository";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";
import { logger } from "../../infrastructure/utils/logger";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").max(255),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export class AuthController {
  private registerUseCase: RegisterUserUseCase;
  private loginUseCase: LoginUserUseCase;

  constructor() {
    const repository = new DrizzleUserRepository();
    this.registerUseCase = new RegisterUserUseCase(repository);
    this.loginUseCase = new LoginUserUseCase(repository);
  }

  async register(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(c, parsed.error.errors[0]?.message ?? "Validation failed", 400);
      }

      const result = await this.registerUseCase.execute(parsed.data);
      return successResponse(c, result, "User registered successfully", 201);
    } catch (error: any) {
      return errorResponse(c, error.message, 400);
    }
  }

  async login(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(c, parsed.error.errors[0]?.message ?? "Validation failed", 400);
      }

      const result = await this.loginUseCase.execute(parsed.data);
      return successResponse(c, result, "Login successful", 200);
    } catch (error: any) {
      return errorResponse(c, error.message, 401);
    }
  }

  async refresh(c: Context) {
    try {
      const body = await c.req.json();
      const { token } = body;

      if (!token || typeof token !== "string") {
        return errorResponse(c, "token is required", 400);
      }

      let decoded: any;
      try {
        decoded = verify(token, process.env.JWT_SECRET!, { ignoreExpiration: true });
      } catch {
        return errorResponse(c, "Invalid token", 401);
      }

      // Only allow refresh within 7 days of expiry
      const nowSec = Math.floor(Date.now() / 1000);
      if (decoded.exp && nowSec - decoded.exp > 7 * 24 * 60 * 60) {
        return errorResponse(c, "Token too old to refresh", 401);
      }

      const userRepo = new DrizzleUserRepository();
      const user = await userRepo.findByEmail(decoded.email);
      if (!user) return errorResponse(c, "User not found", 401);
      if ((user as any).is_blocked) return errorResponse(c, "Account is blocked", 403);

      const newToken = sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "24h" }
      );

      return successResponse(c, { token: newToken }, "Token refreshed");
    } catch (error: any) {
      logger.error("Token refresh error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async loginWithGoogle(c: Context) {
    try {
      const body = await c.req.json();
      const { id_token } = body;

      if (!id_token || typeof id_token !== "string") {
        return errorResponse(c, "id_token is required", 400);
      }

      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`
      );
      const googleData = await googleRes.json() as any;

      if (googleData.error || !googleData.email) {
        return errorResponse(c, "Invalid Google token", 401);
      }

      if (!process.env.GOOGLE_CLIENT_ID) {
        return errorResponse(c, "Google login not configured on server", 503);
      }
      if (googleData.aud !== process.env.GOOGLE_CLIENT_ID) {
        return errorResponse(c, "Invalid Google token audience", 401);
      }

      const userRepo = new DrizzleUserRepository();
      let user = await userRepo.findByEmail(googleData.email);

      if (!user) {
        const randomPassword = await Bun.password.hash(crypto.randomUUID());
        user = await userRepo.create({
          email: googleData.email,
          name: googleData.name || googleData.email.split("@")[0],
          password: randomPassword,
        });
      }

      const token = sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "24h" }
      );

      const { password, ...safeUser } = user as any;
      return successResponse(c, { token, user: safeUser }, "Google login successful");
    } catch (error: any) {
      logger.error("Google auth error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async loginWithFacebook(c: Context) {
    try {
      const body = await c.req.json();
      const { access_token } = body;

      if (!access_token || typeof access_token !== "string") {
        return errorResponse(c, "access_token is required", 400);
      }

      const fbRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(access_token)}`
      );
      const fbData = await fbRes.json() as any;

      if (fbData.error || !fbData.id) {
        return errorResponse(c, "Invalid Facebook token", 401);
      }

      if (!fbData.email) {
        return errorResponse(c, "Facebook account has no email address", 400);
      }

      const userRepo = new DrizzleUserRepository();
      let user = await userRepo.findByEmail(fbData.email);

      if (!user) {
        const randomPassword = await Bun.password.hash(crypto.randomUUID());
        user = await userRepo.create({
          email: fbData.email,
          name: fbData.name || fbData.email.split("@")[0],
          password: randomPassword,
        });
      }

      const token = sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "24h" }
      );

      const { password, ...safeUser } = user as any;
      return successResponse(c, { token, user: safeUser }, "Facebook login successful");
    } catch (error: any) {
      logger.error("Facebook auth error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
