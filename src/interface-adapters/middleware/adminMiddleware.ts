import { Context, Next } from "hono";
import { db } from "../../infrastructure/database/db";
import { users, roles } from "../../infrastructure/database/schema";
import { eq } from "drizzle-orm";
import { errorResponse } from "../../infrastructure/utils/response";

export const adminMiddleware = async (c: Context, next: Next) => {
  const payload = c.get("jwtPayload") as { id: string; email: string } | undefined;
  
  if (!payload || !payload.id) {
    return errorResponse(c, "Unauthorized", 401);
  }

  try {
    const userWithRole = await db
      .select({ roleName: roles.name })
      .from(users)
      .innerJoin(roles, eq(users.role_id, roles.id))
      .where(eq(users.id, payload.id))
      .limit(1);

    if (userWithRole.length === 0 || userWithRole[0].roleName !== "admin") {
      return errorResponse(c, "Forbidden: Admin access required", 403);
    }

    await next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return errorResponse(c, "Internal Server Error", 500);
  }
};
