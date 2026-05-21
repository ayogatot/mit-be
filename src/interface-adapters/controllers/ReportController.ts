import { Context } from "hono";
import { db } from "../../infrastructure/database/db";
import { reports, users } from "../../infrastructure/database/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

export class ReportController {
  async createReport(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const body = await c.req.json();
      const { reported_id, reason, description } = body;

      if (!reported_id) return errorResponse(c, "reported_id is required", 400);
      if (!reason) return errorResponse(c, "reason is required", 400);

      // Validate reported user exists
      const [reportedUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, reported_id))
        .limit(1);

      if (!reportedUser) return errorResponse(c, "Reported user not found", 404);

      if (reported_id === userId) return errorResponse(c, "Cannot report yourself", 400);

      const [newReport] = await db
        .insert(reports)
        .values({
          reporter_id: userId,
          reported_id,
          reason,
          description: description ?? null,
        })
        .returning();

      return successResponse(c, newReport, "Report submitted successfully", 201);
    } catch (error: any) {
      console.error(error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
