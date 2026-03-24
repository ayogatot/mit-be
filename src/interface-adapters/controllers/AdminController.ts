import { Context } from "hono";
import { db } from "../../infrastructure/database/db";
import { genders, interests, relations, languages } from "../../infrastructure/database/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

const tableMap = {
  genders,
  interests,
  relations,
  languages,
};

type TableKey = keyof typeof tableMap;

export class AdminController {
  
  async getAll(c: Context) {
    const tableParam = c.req.param("table") as TableKey;
    if (!tableMap[tableParam]) return errorResponse(c, "Invalid table", 400);

    try {
      const records = await db.select().from(tableMap[tableParam]);
      return successResponse(c, records, "Records fetched successfully", 200);
    } catch (error: any) {
      return errorResponse(c, error.message, 500);
    }
  }

  async create(c: Context) {
    const tableParam = c.req.param("table") as TableKey;
    if (!tableMap[tableParam]) return errorResponse(c, "Invalid table", 400);

    try {
      const body = await c.req.json();
      const records = await db.insert(tableMap[tableParam]).values(body).returning();
      return successResponse(c, records[0], "Record created successfully", 201);
    } catch (error: any) {
      return errorResponse(c, error.message, 400);
    }
  }

  async update(c: Context) {
    const tableParam = c.req.param("table") as TableKey;
    const id = c.req.param("id");
    if (!tableMap[tableParam]) return errorResponse(c, "Invalid table", 400);
    if (!id) return errorResponse(c, "ID is required", 400);

    try {
      const body = await c.req.json();
      const records = await db.update(tableMap[tableParam])
        .set({ ...body, updated_at: new Date() })
        .where(eq(tableMap[tableParam].id as any, id))
        .returning();
      
      if (!records.length) return errorResponse(c, "Not found", 404);
      return successResponse(c, records[0], "Record updated successfully", 200);
    } catch (error: any) {
      return errorResponse(c, error.message, 400);
    }
  }

  async remove(c: Context) {
    const tableParam = c.req.param("table") as TableKey;
    const id = c.req.param("id");
    if (!tableMap[tableParam]) return errorResponse(c, "Invalid table", 400);
    if (!id) return errorResponse(c, "ID is required", 400);

    try {
      const records = await db.delete(tableMap[tableParam])
        .where(eq(tableMap[tableParam].id as any, id))
        .returning();

      if (!records.length) return errorResponse(c, "Not found", 404);
      return successResponse(c, null, "Deleted successfully", 200);
    } catch (error: any) {
      return errorResponse(c, error.message, 400);
    }
  }
}
