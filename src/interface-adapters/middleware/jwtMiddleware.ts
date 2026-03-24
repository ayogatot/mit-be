import { Context, Next } from "hono";
import { verify } from "jsonwebtoken";
import { errorResponse } from "../../infrastructure/utils/response";

export const jwtMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(c, "Missing or invalid Authorization header", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verify(token, process.env.JWT_SECRET || "supersecretjwtkey");
    c.set("jwtPayload", payload);
    await next();
  } catch (error) {
    return errorResponse(c, "Invalid or expired token", 401);
  }
};
