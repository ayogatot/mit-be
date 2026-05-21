import { Context } from "hono";
import { db } from "../../infrastructure/database/db";
import {
  users,
  userInterests,
  userRelations,
  userLanguages,
  userPreferences,
  photos,
  interests,
  relations,
  languages,
} from "../../infrastructure/database/schema";
import { eq, sql } from "drizzle-orm";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";

export class MeController {
  async getMe(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          age: users.age,
          profile_picture_url: users.profile_picture_url,
          job_title: users.job_title,
          zodiac: users.zodiac,
          about_me: users.about_me,
          looking_for: users.looking_for,
          is_verified: users.is_verified,
          is_premium: users.is_premium,
          social_medias: users.social_medias,
          gender_id: users.gender_id,
          location_id: users.location_id,
          role_id: users.role_id,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) return errorResponse(c, "User not found", 404);

      // Fetch interests using type-safe join
      const interestRows = await db
        .select({ id: interests.id, name: interests.name })
        .from(userInterests)
        .innerJoin(interests, eq(userInterests.interest_id, interests.id))
        .where(eq(userInterests.user_id, userId));

      // Fetch languages using type-safe join
      const languageRows = await db
        .select({ id: languages.id, name: languages.name })
        .from(userLanguages)
        .innerJoin(languages, eq(userLanguages.language_id, languages.id))
        .where(eq(userLanguages.user_id, userId));

      // Fetch relations using type-safe join
      const relationRows = await db
        .select({ id: relations.id, name: relations.name })
        .from(userRelations)
        .innerJoin(relations, eq(userRelations.relation_id, relations.id))
        .where(eq(userRelations.user_id, userId));

      // Fetch photos
      const photoRows = await db
        .select({ url: photos.url })
        .from(photos)
        .where(eq(photos.user_id, userId));

      // Fetch preferences
      const [pref] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .limit(1);

      return successResponse(
        c,
        {
          ...user,
          interests: interestRows,
          languages: languageRows,
          relations: relationRows,
          photos: photoRows.map((r) => r.url),
          preferences: pref ?? null,
        },
        "Profile fetched successfully"
      );
    } catch (error: any) {
      console.error(error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async updateMe(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const body = await c.req.json();
      const {
        name,
        age,
        job_title,
        zodiac,
        about_me,
        looking_for,
        social_medias,
        profile_picture_url,
        gender_id,
        location_id,
        interests: interestIds,
        languages: languageIds,
        relations: relationIds,
      } = body;

      const updateData: Record<string, any> = { updated_at: new Date() };
      if (name !== undefined) updateData.name = name;
      if (age !== undefined) updateData.age = age;
      if (job_title !== undefined) updateData.job_title = job_title;
      if (zodiac !== undefined) updateData.zodiac = zodiac;
      if (about_me !== undefined) updateData.about_me = about_me;
      if (looking_for !== undefined) updateData.looking_for = looking_for;
      if (social_medias !== undefined) updateData.social_medias = social_medias;
      if (profile_picture_url !== undefined) updateData.profile_picture_url = profile_picture_url;
      if (gender_id !== undefined) updateData.gender_id = gender_id;
      if (location_id !== undefined) updateData.location_id = location_id;

      // Only update users table if there's something beyond updated_at
      if (Object.keys(updateData).length > 1) {
        await db.update(users).set(updateData).where(eq(users.id, userId));
      }

      if (interestIds !== undefined && Array.isArray(interestIds)) {
        await db.delete(userInterests).where(eq(userInterests.user_id, userId));
        if (interestIds.length > 0) {
          await db.insert(userInterests).values(
            interestIds.map((id: string) => ({ user_id: userId, interest_id: id }))
          );
        }
      }

      if (languageIds !== undefined && Array.isArray(languageIds)) {
        await db.delete(userLanguages).where(eq(userLanguages.user_id, userId));
        if (languageIds.length > 0) {
          await db.insert(userLanguages).values(
            languageIds.map((id: string) => ({ user_id: userId, language_id: id }))
          );
        }
      }

      if (relationIds !== undefined && Array.isArray(relationIds)) {
        await db.delete(userRelations).where(eq(userRelations.user_id, userId));
        if (relationIds.length > 0) {
          await db.insert(userRelations).values(
            relationIds.map((id: string) => ({ user_id: userId, relation_id: id }))
          );
        }
      }

      return successResponse(c, null, "Profile updated successfully");
    } catch (error: any) {
      console.error(error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async updatePreferences(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const body = await c.req.json();

      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .limit(1);

      if (existing) {
        await db
          .update(userPreferences)
          .set({ ...body, updated_at: new Date() })
          .where(eq(userPreferences.user_id, userId));
      } else {
        await db.insert(userPreferences).values({ user_id: userId, ...body });
      }

      const [pref] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .limit(1);

      return successResponse(c, pref, "Preferences updated");
    } catch (error: any) {
      console.error(error);
      return errorResponse(c, error.message, 400);
    }
  }
}
