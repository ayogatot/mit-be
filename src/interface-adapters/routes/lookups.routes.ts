import { Hono } from "hono";
import { db } from "../../infrastructure/database/db";
import { interests, languages, relations, genders } from "../../infrastructure/database/schema";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

const lookupsRoutes = new Hono();

lookupsRoutes.get("/interests", async (c) => {
  try {
    const records = await db.select().from(interests);
    return successResponse(c, records, "Interests fetched successfully");
  } catch (error: any) {
    return errorResponse(c, "Internal Server Error", 500);
  }
});

lookupsRoutes.get("/languages", async (c) => {
  try {
    const records = await db.select().from(languages);
    return successResponse(c, records, "Languages fetched successfully");
  } catch (error: any) {
    return errorResponse(c, "Internal Server Error", 500);
  }
});

lookupsRoutes.get("/relations", async (c) => {
  try {
    const records = await db.select().from(relations);
    return successResponse(c, records, "Relations fetched successfully");
  } catch (error: any) {
    return errorResponse(c, "Internal Server Error", 500);
  }
});

lookupsRoutes.get("/genders", async (c) => {
  try {
    const records = await db.select().from(genders);
    return successResponse(c, records, "Genders fetched successfully");
  } catch (error: any) {
    return errorResponse(c, "Internal Server Error", 500);
  }
});

export default lookupsRoutes;
