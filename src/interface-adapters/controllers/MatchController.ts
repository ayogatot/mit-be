import { Context } from "hono";
import { db } from "../../infrastructure/database/db";
import { swipeHistory, users, messages } from "../../infrastructure/database/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";
import { logger } from "../../infrastructure/utils/logger";

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
      logger.error("getMatches error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async deleteMatch(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const matchedUserId = c.req.param("matchId");

      // Verify the match exists (current user liked matched user)
      const [myLike] = await db
        .select()
        .from(swipeHistory)
        .where(and(
          eq(swipeHistory.user_id, userId),
          eq(swipeHistory.target_id, matchedUserId),
          eq(swipeHistory.is_liked, true)
        ))
        .limit(1);

      if (!myLike) return errorResponse(c, "Match not found", 404);

      // Remove both swipe records (unmatch)
      await db.delete(swipeHistory).where(
        and(eq(swipeHistory.user_id, userId), eq(swipeHistory.target_id, matchedUserId))
      );
      await db.delete(swipeHistory).where(
        and(eq(swipeHistory.user_id, matchedUserId), eq(swipeHistory.target_id, userId))
      );

      // Delete chat messages between both users
      await db.delete(messages).where(
        or(
          and(eq(messages.sender_id, userId), eq(messages.receiver_id, matchedUserId)),
          and(eq(messages.sender_id, matchedUserId), eq(messages.receiver_id, userId))
        )
      );

      return successResponse(c, null, "Match deleted");
    } catch (error: any) {
      logger.error("deleteMatch error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
