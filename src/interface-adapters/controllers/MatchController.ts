import { Context } from "hono";
import { db } from "../../infrastructure/database/db";
import { swipeHistory, users, messages } from "../../infrastructure/database/schema";
import { and, eq, sql } from "drizzle-orm";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

export class MatchController {
  async getMatches(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      // A match exists when:
      //   current user liked target  (swipeHistory row: user_id=userId, target_id=X, is_liked=true)
      //   AND target liked current user (swipeHistory row: user_id=X, target_id=userId, is_liked=true)
      //
      // We find all targets that the current user liked, then filter those where the
      // reverse like also exists.

      const myLikes = db
        .select({ matched_user_id: swipeHistory.target_id })
        .from(swipeHistory)
        .where(and(eq(swipeHistory.user_id, userId), eq(swipeHistory.is_liked, true)))
        .as("my_likes");

      const mutualLikes = db
        .select({ matched_user_id: myLikes.matched_user_id })
        .from(myLikes)
        .innerJoin(
          swipeHistory,
          and(
            eq(swipeHistory.user_id, myLikes.matched_user_id),
            eq(swipeHistory.target_id, userId),
            eq(swipeHistory.is_liked, true)
          )
        )
        .as("mutual_likes");

      // Fetch matched user profiles + last message
      const matches = await db
        .select({
          matched_user_id: mutualLikes.matched_user_id,
          name: users.name,
          profile_picture_url: users.profile_picture_url,
          age: users.age,
          job_title: users.job_title,
          is_verified: users.is_verified,
          is_premium: users.is_premium,
          last_message: sql<{
            id: string;
            content: string;
            sender_id: string;
            is_read: boolean;
            created_at: string;
          } | null>`(
            SELECT jsonb_build_object(
              'id', m.id,
              'content', m.content,
              'sender_id', m.sender_id,
              'is_read', m.is_read,
              'created_at', m.created_at
            )
            FROM messages m
            WHERE (m.sender_id = ${userId} AND m.receiver_id = ${users.id})
               OR (m.sender_id = ${users.id} AND m.receiver_id = ${userId})
            ORDER BY m.created_at DESC
            LIMIT 1
          )`,
        })
        .from(mutualLikes)
        .innerJoin(users, eq(users.id, mutualLikes.matched_user_id));

      return successResponse(c, matches, "Matches fetched successfully");
    } catch (error: any) {
      console.error(error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
