import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer, numeric, AnyPgColumn, index } from "drizzle-orm/pg-core";

const timestamps = {
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
};

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  parent_id: uuid("parent_id").references((): AnyPgColumn => locations.id),
  name: varchar("name", { length: 255 }).notNull(),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  ...timestamps,
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  ...timestamps,
});

export const genders = pgTable("genders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  ...timestamps,
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role_id: uuid("role_id").references(() => roles.id).notNull(),
  location_id: uuid("location_id").references(() => locations.id),
  gender_id: uuid("gender_id").references(() => genders.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  age: integer("age"),
  profile_picture_url: text("profile_picture_url"),
  job_title: varchar("job_title", { length: 255 }),
  zodiac: varchar("zodiac", { length: 50 }),
  about_me: text("about_me"),
  looking_for: varchar("looking_for", { length: 255 }),
  social_medias: jsonb("social_medias"),
  is_verified: boolean("is_verified").default(false).notNull(),
  is_blocked: boolean("is_blocked").default(false).notNull(),
  is_premium: boolean("is_premium").default(false).notNull(),
  ...timestamps,
});

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  url: text("url").notNull(),
  ...timestamps,
}, (table) => [
  index("photos_user_id_idx").on(table.user_id),
]);

export const interests = pgTable("interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  ...timestamps,
});

export const userInterests = pgTable("user_interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  interest_id: uuid("interest_id").references(() => interests.id).notNull(),
  ...timestamps,
}, (table) => [
  index("user_interests_user_id_idx").on(table.user_id),
]);

export const relations = pgTable("relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  ...timestamps,
});

export const userRelations = pgTable("user_relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  relation_id: uuid("relation_id").references(() => relations.id).notNull(),
  ...timestamps,
}, (table) => [
  index("user_relations_user_id_idx").on(table.user_id),
]);

export const languages = pgTable("languages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  ...timestamps,
});

export const userLanguages = pgTable("user_languages", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  language_id: uuid("language_id").references(() => languages.id).notNull(),
  ...timestamps,
}, (table) => [
  index("user_languages_user_id_idx").on(table.user_id),
]);

export const swipeHistory = pgTable("swipe_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  target_id: uuid("target_id").references(() => users.id).notNull(),
  is_liked: boolean("is_liked").notNull(),
  is_swiped: boolean("is_swiped").default(true).notNull(),
  ...timestamps,
}, (table) => [
  index("swipe_history_user_id_idx").on(table.user_id),
  index("swipe_history_target_id_idx").on(table.target_id),
  index("swipe_history_user_target_idx").on(table.user_id, table.target_id),
]);

export const meets = pgTable("meets", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  location_id: uuid("location_id").references(() => locations.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("OPEN").notNull(),
  meet_date: timestamp("meet_date"),
  ...timestamps,
}, (table) => [
  index("meets_user_id_idx").on(table.user_id),
  index("meets_status_idx").on(table.status),
]);

export const meetInterests = pgTable("meet_interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  meet_id: uuid("meet_id").references(() => meets.id).notNull(),
  interest_id: uuid("interest_id").references(() => interests.id).notNull(),
  ...timestamps,
});

export const meetRequests = pgTable("meet_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  meet_id: uuid("meet_id").references(() => meets.id).notNull(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 50 }).default("PENDING").notNull(),
  message: text("message"),
  ...timestamps,
}, (table) => [
  index("meet_requests_meet_id_idx").on(table.meet_id),
]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sender_id: uuid("sender_id").references(() => users.id).notNull(),
  receiver_id: uuid("receiver_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  is_read: boolean("is_read").default(false).notNull(),
  ...timestamps,
}, (table) => [
  index("messages_sender_receiver_idx").on(table.sender_id, table.receiver_id),
  index("messages_created_at_idx").on(table.created_at),
]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporter_id: uuid("reporter_id").references(() => users.id).notNull(),
  reported_id: uuid("reported_id").references(() => users.id).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull().unique(),
  age_min: integer("age_min").default(18),
  age_max: integer("age_max").default(45),
  gender_preference: varchar("gender_preference", { length: 50 }),
  looking_for: varchar("looking_for", { length: 255 }),
  max_distance_km: integer("max_distance_km").default(50),
  ...timestamps,
});

export const pushNotificationTokens = pgTable("push_notification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  token: text("token").notNull(),
  platform: varchar("platform", { length: 10 }).notNull(), // 'android' or 'ios'
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("push_tokens_user_id_idx").on(table.user_id),
]);
