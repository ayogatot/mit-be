export interface SwipeRecord {
  id: string;
  user_id: string;
  target_id: string;
  is_liked: boolean;
  is_swiped: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SwipeRepository {
  recordSwipe(userId: string, targetId: string, isLiked: boolean): Promise<SwipeRecord>;
  checkMutualMatch(userId: string, targetId: string): Promise<boolean>;
}
