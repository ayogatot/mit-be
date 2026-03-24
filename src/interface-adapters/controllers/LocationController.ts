import { Context } from "hono";
import { db } from "../../infrastructure/database/db";
import { locations } from "../../infrastructure/database/schema";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

export class LocationController {
  
  async getAll(c: Context) {
    try {
      const records = await db.select().from(locations);
      return successResponse(c, records, "Locations fetched successfully", 200);
    } catch (error: any) {
      return errorResponse(c, error.message, 500);
    }
  }

  async create(c: Context) {
    try {
      const body = await c.req.json();
      
      const [newLocation] = await db.insert(locations).values({
        name: body.name,
        parent_id: body.parent_id || null,
        latitude: body.latitude ? body.latitude.toString() : null, // numeric types map directly to strings or floats safely via Drizzle ORM
        longitude: body.longitude ? body.longitude.toString() : null,
      }).returning();
      
      return successResponse(c, newLocation, "Location created successfully", 201);
    } catch (error: any) {
      return errorResponse(c, error.message, 400);
    }
  }
}
