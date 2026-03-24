import { db } from "../database/db";
import { users, swipeHistory, roles, userInterests, userRelations } from "../database/schema";
import { UserRepository, User } from "../../domain/repositories/UserRepository";
import { eq, notInArray, sql, desc } from "drizzle-orm";

export class DrizzleUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return (user as User) || null;
  }

  async create(userData: Partial<User>): Promise<User> {
    const [userRole] = await db.select().from(roles).where(eq(roles.name, 'user')).limit(1);

    const [user] = await db.insert(users)
      .values({
        email: userData.email!,
        password: userData.password!,
        name: userData.name!,
        role_id: userRole?.id, // Assumes seed is run
      })
      .returning();
      
    // Remove password from returned object for safety
    const { password, ...safeUser } = user;
    return safeUser as User;
  }

  async getUnswipedProfiles(userId: string, limit: number = 20, offset: number = 0): Promise<User[]> {
    // 1. Get current user's interests and relations for matching score
    const currentUserInterests = await db.select({ id: userInterests.interest_id })
      .from(userInterests).where(eq(userInterests.user_id, userId));
    const currentUserRelations = await db.select({ id: userRelations.relation_id })
      .from(userRelations).where(eq(userRelations.user_id, userId));

    const interestIds = currentUserInterests.map(i => i.id);
    const relationIds = currentUserRelations.map(r => r.id);

    // 2. Build swiped targets constraint
    const swipedTargets = await db.select({ target_id: swipeHistory.target_id })
      .from(swipeHistory)
      .where(eq(swipeHistory.user_id, userId));
      
    const swipedIds = swipedTargets.map(t => t.target_id);
    swipedIds.push(userId); // Add self to exclude

    // 3. Construct raw SQL match scoring logic
    let sharedInterestsQuery = sql`0`;
    if (interestIds.length > 0) {
      const interestSqlList = sql.join(interestIds.map(id => sql`${id}`), sql`, `);
      sharedInterestsQuery = sql`(SELECT COUNT(*)::int FROM "user_interests" ui WHERE ui.user_id = users.id AND ui.interest_id IN (${interestSqlList}))`;
    }

    let sharedRelationsQuery = sql`0`;
    if (relationIds.length > 0) {
      const relationSqlList = sql.join(relationIds.map(id => sql`${id}`), sql`, `);
      sharedRelationsQuery = sql`(SELECT COUNT(*)::int FROM "user_relations" ur WHERE ur.user_id = users.id AND ur.relation_id IN (${relationSqlList}))`;
    }

    const matchScore = sql`${sharedInterestsQuery} + ${sharedRelationsQuery}`.as('match_score');

    // 4. Select users not in the swiped list, prioritizing by score
    const unswiped = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        gender_id: users.gender_id,
        age: users.age,
        profile_picture_url: users.profile_picture_url,
        job_title: users.job_title,
        zodiac: users.zodiac,
        about_me: users.about_me,
        looking_for: users.looking_for,
        is_verified: users.is_verified,
        is_premium: users.is_premium,
        match_score: matchScore,
        interests: sql`COALESCE((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name)) FROM "user_interests" ui JOIN "interests" i ON ui.interest_id = i.id WHERE ui.user_id = users.id), '[]'::jsonb)`,
        relations: sql`COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)) FROM "user_relations" ur JOIN "relations" r ON ur.relation_id = r.id WHERE ur.user_id = users.id), '[]'::jsonb)`
      })
      .from(users)
      .where(notInArray(users.id, swipedIds))
      .orderBy(desc(matchScore))
      .limit(limit)
      .offset(offset);

    // Filter out match_score to align strictly with the expected User object array
    return unswiped.map(({ match_score, ...u }) => u) as User[];
  }
}
