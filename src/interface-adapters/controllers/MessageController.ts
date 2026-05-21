import { Context } from "hono";
import { db } from "../../infrastructure/database/db";
import { swipeHistory, messages } from "../../infrastructure/database/schema";
import { and, eq, or, asc } from "drizzle-orm";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

async function areMatched(userA: string, userB: string): Promise<boolean> {
  // userA liked userB
  const [aLikedB] = await db
    .select()
    .from(swipeHistory)
    .where(and(eq(swipeHistory.user_id, userA), eq(swipeHistory.target_id, userB), eq(swipeHistory.is_liked, true)))
    .limit(1);

  if (!aLikedB) return false;

  // userB liked userA
  const [bLikedA] = await db
    .select()
    .from(swipeHistory)
    .where(and(eq(swipeHistory.user_id, userB), eq(swipeHistory.target_id, userA), eq(swipeHistory.is_liked, true)))
    .limit(1);

  return !!bLikedA;
}

export class MessageController {
  async getConversation(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const matchId = c.req.param("matchId");

      const matched = await areMatched(userId, matchId);
      if (!matched) return errorResponse(c, "Not matched with this user", 403);

      const conversation = await db
        .select()
        .from(messages)
        .where(
          or(
            and(eq(messages.sender_id, userId), eq(messages.receiver_id, matchId)),
            and(eq(messages.sender_id, matchId), eq(messages.receiver_id, userId))
          )
        )
        .orderBy(asc(messages.created_at));

      // Mark incoming messages as read
      await db
        .update(messages)
        .set({ is_read: true })
        .where(and(eq(messages.sender_id, matchId), eq(messages.receiver_id, userId), eq(messages.is_read, false)));

      return successResponse(c, conversation, "Conversation fetched successfully");
    } catch (error: any) {
      console.error(error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async sendMessage(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const matchId = c.req.param("matchId");
      const body = await c.req.json();
      const { content } = body;

      if (!content || typeof content !== "string" || content.trim() === "") {
        return errorResponse(c, "Content is required", 400);
      }

      const matched = await areMatched(userId, matchId);
      if (!matched) return errorResponse(c, "Not matched with this user", 403);

      const [newMessage] = await db
        .insert(messages)
        .values({
          sender_id: userId,
          receiver_id: matchId,
          content: content.trim(),
        })
        .returning();

      return successResponse(c, newMessage, "Message sent", 201);
    } catch (error: any) {
      console.error(error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
