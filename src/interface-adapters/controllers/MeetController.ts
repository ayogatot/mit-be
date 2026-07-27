import { Context } from "hono";
import { z } from "zod";
import { db } from "../../infrastructure/database/db";
import {
  meets,
  meetRequests,
  meetInterests,
  users,
  interests,
} from "../../infrastructure/database/schema";
import { eq, ne, and, sql } from "drizzle-orm";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";
import { logger } from "../../infrastructure/utils/logger";

const createMeetSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  meet_date: z.string().datetime({ offset: true }).optional(),
  location_id: z.string().uuid().optional(),
  interest_ids: z.array(z.string().uuid()).optional(),
});

export class MeetController {
  async getExploreMeets(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const meetList = await db
        .select({
          id: meets.id,
          title: meets.title,
          description: meets.description,
          status: meets.status,
          meet_date: meets.meet_date,
          location_id: meets.location_id,
          created_at: meets.created_at,
          creator: sql<{
            id: string;
            name: string;
            profile_picture_url: string | null;
            age: number | null;
            job_title: string | null;
          }>`jsonb_build_object(
            'id', ${users.id},
            'name', ${users.name},
            'profile_picture_url', ${users.profile_picture_url},
            'age', ${users.age},
            'job_title', ${users.job_title}
          )`,
          meet_interests: sql<{ id: string; name: string }[]>`COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name))
             FROM meet_interests mi
             JOIN interests i ON mi.interest_id = i.id
             WHERE mi.meet_id = ${meets.id}
            ), '[]'::jsonb)`,
        })
        .from(meets)
        .innerJoin(users, eq(meets.user_id, users.id))
        .where(and(ne(meets.user_id, userId), eq(meets.status, "OPEN")))
        .orderBy(sql`${meets.created_at} DESC`);

      return successResponse(c, meetList, "Meets fetched successfully");
    } catch (error: any) {
      logger.error("getExploreMeets error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async getMyMeets(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const meetList = await db
        .select({
          id: meets.id,
          title: meets.title,
          description: meets.description,
          status: meets.status,
          meet_date: meets.meet_date,
          location_id: meets.location_id,
          created_at: meets.created_at,
          updated_at: meets.updated_at,
          meet_interests: sql<{ id: string; name: string }[]>`COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name))
             FROM meet_interests mi
             JOIN interests i ON mi.interest_id = i.id
             WHERE mi.meet_id = ${meets.id}
            ), '[]'::jsonb)`,
          request_count: sql<number>`(SELECT COUNT(*) FROM meet_requests mr WHERE mr.meet_id = ${meets.id})`,
        })
        .from(meets)
        .where(eq(meets.user_id, userId))
        .orderBy(sql`${meets.created_at} DESC`);

      return successResponse(c, meetList, "My meets fetched successfully");
    } catch (error: any) {
      logger.error("getMyMeets error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async createMeet(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const body = await c.req.json();
      const parsed = createMeetSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(c, parsed.error.errors[0]?.message ?? "Validation failed", 400);
      }

      const { title, description, meet_date, location_id, interest_ids } = parsed.data;

      const [newMeet] = await db
        .insert(meets)
        .values({
          user_id: userId,
          title,
          description: description ?? null,
          meet_date: meet_date ? new Date(meet_date) : null,
          location_id: location_id ?? null,
        })
        .returning();

      if (interest_ids && Array.isArray(interest_ids) && interest_ids.length > 0) {
        await db.insert(meetInterests).values(
          interest_ids.map((id: string) => ({ meet_id: newMeet.id, interest_id: id }))
        );
      }

      return successResponse(c, newMeet, "Meet created successfully", 201);
    } catch (error: any) {
      logger.error("createMeet error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async getMeetRequests(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const meetId = c.req.param("id");

      const [meet] = await db
        .select()
        .from(meets)
        .where(and(eq(meets.id, meetId), eq(meets.user_id, userId)))
        .limit(1);

      if (!meet) return errorResponse(c, "Meet not found or access denied", 404);

      const requests = await db
        .select({
          id: meetRequests.id,
          status: meetRequests.status,
          message: meetRequests.message,
          created_at: meetRequests.created_at,
          requester: sql<{
            id: string;
            name: string;
            profile_picture_url: string | null;
            age: number | null;
          }>`jsonb_build_object(
            'id', ${users.id},
            'name', ${users.name},
            'profile_picture_url', ${users.profile_picture_url},
            'age', ${users.age}
          )`,
        })
        .from(meetRequests)
        .innerJoin(users, eq(meetRequests.user_id, users.id))
        .where(eq(meetRequests.meet_id, meetId))
        .orderBy(sql`${meetRequests.created_at} DESC`);

      return successResponse(c, requests, "Meet requests fetched successfully");
    } catch (error: any) {
      logger.error("getMeetRequests error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async createMeetRequest(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const meetId = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const { message } = body;

      const [meet] = await db
        .select()
        .from(meets)
        .where(and(eq(meets.id, meetId), eq(meets.status, "OPEN")))
        .limit(1);

      if (!meet) return errorResponse(c, "Meet not found or not open", 404);
      if (meet.user_id === userId) return errorResponse(c, "Cannot request own meet", 400);

      const [existing] = await db
        .select()
        .from(meetRequests)
        .where(and(eq(meetRequests.meet_id, meetId), eq(meetRequests.user_id, userId)))
        .limit(1);

      if (existing) return errorResponse(c, "Already requested this meet", 409);

      const [newRequest] = await db
        .insert(meetRequests)
        .values({
          meet_id: meetId,
          user_id: userId,
          message: message ?? null,
        })
        .returning();

      return successResponse(c, newRequest, "Meet request created", 201);
    } catch (error: any) {
      logger.error("createMeetRequest error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async updateMeetRequest(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const meetId = c.req.param("id");
      const requestId = c.req.param("requestId");
      const body = await c.req.json();
      const { status } = body;

      if (!["ACCEPTED", "REJECTED"].includes(status)) {
        return errorResponse(c, "Status must be ACCEPTED or REJECTED", 400);
      }

      const [meet] = await db
        .select()
        .from(meets)
        .where(and(eq(meets.id, meetId), eq(meets.user_id, userId)))
        .limit(1);

      if (!meet) return errorResponse(c, "Meet not found or access denied", 404);

      const [updated] = await db
        .update(meetRequests)
        .set({ status, updated_at: new Date() })
        .where(and(eq(meetRequests.id, requestId), eq(meetRequests.meet_id, meetId)))
        .returning();

      if (!updated) return errorResponse(c, "Request not found", 404);

      return successResponse(c, updated, "Meet request updated");
    } catch (error: any) {
      logger.error("updateMeetRequest error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async updateMeetStatus(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const meetId = c.req.param("id");
      const body = await c.req.json();
      const { status } = body;

      if (!["OPEN", "DONE", "CANCELLED"].includes(status)) {
        return errorResponse(c, "Status must be OPEN, DONE, or CANCELLED", 400);
      }

      const [updated] = await db
        .update(meets)
        .set({ status, updated_at: new Date() })
        .where(and(eq(meets.id, meetId), eq(meets.user_id, userId)))
        .returning();

      if (!updated) return errorResponse(c, "Meet not found or access denied", 404);

      return successResponse(c, updated, "Meet status updated");
    } catch (error: any) {
      logger.error("updateMeetStatus error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
