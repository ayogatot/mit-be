import { Context } from "hono";
import { z } from "zod";
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
  pushNotificationTokens,
} from "../../infrastructure/database/schema";
import { and, eq } from "drizzle-orm";
import { successResponse, errorResponse } from "../../infrastructure/utils/response";
import { logger } from "../../infrastructure/utils/logger";

const updateMeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  age: z.number().int().min(18).max(100).optional(),
  job_title: z.string().max(255).optional().nullable(),
  zodiac: z.string().max(50).optional().nullable(),
  about_me: z.string().optional().nullable(),
  looking_for: z.string().max(255).optional().nullable(),
  social_medias: z.any().optional(),
  profile_picture_url: z.string().optional().nullable(),
  gender_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  interests: z.array(z.string().uuid()).optional(),
  languages: z.array(z.string().uuid()).optional(),
  relations: z.array(z.string().uuid()).optional(),
});

const updatePreferencesSchema = z.object({
  age_min: z.number().int().min(18).max(100).optional(),
  age_max: z.number().int().min(18).max(100).optional(),
  gender_preference: z.string().max(50).optional(),
  looking_for: z.string().max(255).optional(),
  max_distance_km: z.number().int().min(1).max(500).optional(),
});

const fcmTokenSchema = z.object({
  token: z.string().min(1, "token is required"),
  platform: z.enum(["android", "ios"], { error: "platform must be android or ios" }),
});

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

      const interestRows = await db
        .select({ id: interests.id, name: interests.name })
        .from(userInterests)
        .innerJoin(interests, eq(userInterests.interest_id, interests.id))
        .where(eq(userInterests.user_id, userId));

      const languageRows = await db
        .select({ id: languages.id, name: languages.name })
        .from(userLanguages)
        .innerJoin(languages, eq(userLanguages.language_id, languages.id))
        .where(eq(userLanguages.user_id, userId));

      const relationRows = await db
        .select({ id: relations.id, name: relations.name })
        .from(userRelations)
        .innerJoin(relations, eq(userRelations.relation_id, relations.id))
        .where(eq(userRelations.user_id, userId));

      const photoRows = await db
        .select({ url: photos.url })
        .from(photos)
        .where(eq(photos.user_id, userId));

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
      logger.error("getMe error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async updateMe(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const body = await c.req.json();
      const parsed = updateMeSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(c, parsed.error.errors[0]?.message ?? "Validation failed", 400);
      }

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
      } = parsed.data;

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

      if (Object.keys(updateData).length > 1) {
        await db.update(users).set(updateData).where(eq(users.id, userId));
      }

      // When a profile picture URL is set, also track it in the photos gallery
      if (profile_picture_url) {
        const exists = await db
          .select({ id: photos.id })
          .from(photos)
          .where(and(eq(photos.user_id, userId), eq(photos.url, profile_picture_url)))
          .limit(1);
        if (exists.length === 0) {
          await db.insert(photos).values({ user_id: userId, url: profile_picture_url });
        }
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
      logger.error("updateMe error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async getPreferences(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const [pref] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .limit(1);

      return successResponse(c, pref ?? null, "Preferences fetched");
    } catch (error: any) {
      logger.error("getPreferences error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async updatePreferences(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const body = await c.req.json();
      const parsed = updatePreferencesSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(c, parsed.error.errors[0]?.message ?? "Validation failed", 400);
      }

      const { age_min, age_max, gender_preference, looking_for, max_distance_km } = parsed.data;

      const safeUpdate: Record<string, any> = { updated_at: new Date() };
      if (age_min !== undefined) safeUpdate.age_min = age_min;
      if (age_max !== undefined) safeUpdate.age_max = age_max;
      if (gender_preference !== undefined) safeUpdate.gender_preference = gender_preference;
      if (looking_for !== undefined) safeUpdate.looking_for = looking_for;
      if (max_distance_km !== undefined) safeUpdate.max_distance_km = max_distance_km;

      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .limit(1);

      if (existing) {
        await db
          .update(userPreferences)
          .set(safeUpdate)
          .where(eq(userPreferences.user_id, userId));
      } else {
        await db.insert(userPreferences).values({ user_id: userId, ...safeUpdate });
      }

      const [pref] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .limit(1);

      return successResponse(c, pref, "Preferences updated");
    } catch (error: any) {
      logger.error("updatePreferences error", error);
      return errorResponse(c, error.message, 400);
    }
  }

  async registerFcmToken(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const body = await c.req.json();
      const parsed = fcmTokenSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(c, parsed.error.errors[0]?.message ?? "Validation failed", 400);
      }

      const { token, platform } = parsed.data;

      // Upsert: replace existing token for this user+platform
      await db.delete(pushNotificationTokens).where(
        and(
          eq(pushNotificationTokens.user_id, userId),
          eq(pushNotificationTokens.platform, platform)
        )
      );
      await db.insert(pushNotificationTokens).values({ user_id: userId, token, platform });

      return successResponse(c, null, "FCM token registered");
    } catch (error: any) {
      logger.error("registerFcmToken error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }

  async changePassword(c: Context) {
    try {
      const userId = c.get("jwtPayload")?.id;
      if (!userId) return errorResponse(c, "Unauthorized", 401);

      const body = await c.req.json();
      const { old_password, new_password } = body;

      if (!old_password || typeof old_password !== "string") {
        return errorResponse(c, "old_password is required", 400);
      }
      if (!new_password || typeof new_password !== "string" || new_password.length < 6) {
        return errorResponse(c, "new_password must be at least 6 characters", 400);
      }

      const [user] = await db
        .select({ id: users.id, password: users.password })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) return errorResponse(c, "User not found", 404);

      const isMatch = await Bun.password.verify(old_password, user.password);
      if (!isMatch) return errorResponse(c, "Current password is incorrect", 400);

      const hashed = await Bun.password.hash(new_password);
      await db
        .update(users)
        .set({ password: hashed, updated_at: new Date() })
        .where(eq(users.id, userId));

      return successResponse(c, null, "Password changed successfully");
    } catch (error: any) {
      logger.error("changePassword error", error);
      return errorResponse(c, "Internal Server Error", 500);
    }
  }
}
