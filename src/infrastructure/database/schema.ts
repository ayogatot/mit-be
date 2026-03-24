import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer, numeric, AnyPgColumn } from "drizzle-orm/pg-core";

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
});

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
});

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
});

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
});

export const swipeHistory = pgTable("swipe_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  target_id: uuid("target_id").references(() => users.id).notNull(),
  is_liked: boolean("is_liked").notNull(),
  is_swiped: boolean("is_swiped").default(true).notNull(),
  ...timestamps,
});
