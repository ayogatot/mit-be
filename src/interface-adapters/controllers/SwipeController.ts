import { Context } from "hono";
import { SwipeActionUseCase } from "../../use-cases/swipe/SwipeAction";
import { DrizzleSwipeRepository } from "../../infrastructure/repositories/DrizzleSwipeRepository";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

export class SwipeController {
  private useCase: SwipeActionUseCase;

  constructor() {
    // In a real application, this would be injected via a Dependency Injection container.
    const repository = new DrizzleSwipeRepository();
    this.useCase = new SwipeActionUseCase(repository);
  }

  async handleSwipe(c: Context) {
    try {
      // Assuming user ID is injected via JWT middleware into c.get('userId')
      const userId = c.get('jwtPayload')?.id; 
      if (!userId) {
        return errorResponse(c, "Unauthorized", 401);
      }

      const body = await c.req.json();
      const targetId = body.targetId;
      const isLiked = body.isLiked;

      if (!targetId || typeof isLiked !== 'boolean') {
        return errorResponse(c, "Invalid payload", 400);
      }

      const result = await this.useCase.execute({
        userId,
        targetId,
        isLiked
      });

      return successResponse(c, result, "Swipe recorded successfully", 200);
    } catch (error) {
      console.error(error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
