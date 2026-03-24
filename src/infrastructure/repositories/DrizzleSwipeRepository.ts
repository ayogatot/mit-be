import { db } from "../database/db";
import { swipeHistory } from "../database/schema";
import { SwipeRepository, SwipeRecord } from "../../domain/repositories/SwipeRepository";
import { and, eq } from "drizzle-orm";

export class DrizzleSwipeRepository implements SwipeRepository {
  async recordSwipe(userId: string, targetId: string, isLiked: boolean): Promise<SwipeRecord> {
    const [record] = await db.insert(swipeHistory)
      .values({
        user_id: userId,
        target_id: targetId,
        is_liked: isLiked,
        is_swiped: true,
      })
      .returning();
      
    return record;
  }

  async checkMutualMatch(userId: string, targetId: string): Promise<boolean> {
    const [targetSwipe] = await db.select()
      .from(swipeHistory)
      .where(
        and(
          eq(swipeHistory.user_id, targetId),
          eq(swipeHistory.target_id, userId),
          eq(swipeHistory.is_liked, true)
        )
      );
      
    return !!targetSwipe;
  }
}
