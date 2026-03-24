import { SwipeRepository } from "../../domain/repositories/SwipeRepository";

export interface SwipeInput {
  userId: string;
  targetId: string;
  isLiked: boolean;
}

export interface SwipeOutput {
  success: boolean;
  isMatch: boolean;
}

export class SwipeActionUseCase {
  constructor(private swipeRepository: SwipeRepository) {}

  async execute(input: SwipeInput): Promise<SwipeOutput> {
    // 1. Record the swipe
    await this.swipeRepository.recordSwipe(input.userId, input.targetId, input.isLiked);

    // 2. If it's a right swipe (isLiked = true), check for mutual match
    let isMatch = false;
    if (input.isLiked) {
      isMatch = await this.swipeRepository.checkMutualMatch(input.userId, input.targetId);
    }

    return {
      success: true,
      isMatch,
    };
  }
}
