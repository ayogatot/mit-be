import { db } from "./db";
import { roles, users, interests, relations, languages, genders, userInterests, userRelations } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");
  try {
    // 1. Seed Roles
    const roleList = ['admin', 'user'];
    for (const roleName of roleList) {
      const existing = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
      if (existing.length === 0) {
        await db.insert(roles).values({ name: roleName });
        console.log(`Role '${roleName}' seeded.`);
      } else {
        console.log(`Role '${roleName}' already exists.`);
      }
    }

    // 2. Seed Admin User
    const adminRole = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
    if (!adminRole.length) throw new Error("Admin role missing.");
    
    // Check if admin user exists
    const adminEmail = 'admin@datingapp.com';
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    if (existingAdmin.length === 0) {
      const hashedPassword = await Bun.password.hash("admin123");
      await db.insert(users).values({
        email: adminEmail,
        password: hashedPassword,
        name: "Super Admin",
        role_id: adminRole[0].id,
      });
      console.log(`Admin user seeded: ${adminEmail} / admin123`);
    } else {
      console.log("Admin user already exists.");
    }

    // 3. Seed Interests
    const interestsList = [
      'Movies',
      'Tennis',
      'Hiking & Outdoors',
      'Cooking & Food',
      'Board Games & Card Games',
      'Fitness & Workout',
      'Yoga & Meditation',
      'Painting & Art',
      'Dance',
      'Book & Literature'
    ];
    for (const interestName of interestsList) {
      const existing = await db.select().from(interests).where(eq(interests.name, interestName)).limit(1);
      if (existing.length === 0) {
        await db.insert(interests).values({ name: interestName });
        console.log(`Interest '${interestName}' seeded.`);
      } else {
        console.log(`Interest '${interestName}' already exists.`);
      }
    }

    // 4. Seed Relations
    const relationsList = [
      'Casual Dating',
      'Serious Relationship',
      'Open Relationship',
      'Just for fun',
      'Meeting New Friends'
    ];
    for (const relationName of relationsList) {
      const existing = await db.select().from(relations).where(eq(relations.name, relationName)).limit(1);
      if (existing.length === 0) {
        await db.insert(relations).values({ name: relationName });
        console.log(`Relation '${relationName}' seeded.`);
      } else {
        console.log(`Relation '${relationName}' already exists.`);
      }
    }

    // 5. Seed Languages
    const languagesList = [
      'Indonesia',
      'English'
    ];
    for (const languageName of languagesList) {
      const existing = await db.select().from(languages).where(eq(languages.name, languageName)).limit(1);
      if (existing.length === 0) {
        await db.insert(languages).values({ name: languageName });
        console.log(`Language '${languageName}' seeded.`);
      } else {
        console.log(`Language '${languageName}' already exists.`);
      }
    }

    // 6. Seed Genders
    const gendersList = ['Male', 'Female'];
    for (const genderName of gendersList) {
      const existing = await db.select().from(genders).where(eq(genders.name, genderName)).limit(1);
      if (existing.length === 0) {
        await db.insert(genders).values({ name: genderName });
        console.log(`Gender '${genderName}' seeded.`);
      } else {
        console.log(`Gender '${genderName}' already exists.`);
      }
    }

    // 7. Seed Dummy Users
    console.log("Seeding dummy users...");
    const userRole = await db.select().from(roles).where(eq(roles.name, 'user')).limit(1);
    if (!userRole.length) throw new Error("User role missing.");

    const gendersInDb = await db.select().from(genders);
    const interestsInDb = await db.select().from(interests);
    const relationsInDb = await db.select().from(relations);
    
    const usersData = require("./data/user.json");

    for (const u of usersData) {
      const existing = await db.select().from(users).where(eq(users.email, u.email)).limit(1);
      if (existing.length === 0) {
        const gender = gendersInDb.find(g => g.name === u.gender);
        const passwordHash = await Bun.password.hash("123456");
        
        const [newUser] = await db.insert(users).values({
          name: u.name,
          email: u.email,
          password: passwordHash,
          age: u.age,
          job_title: u.job_title,
          gender_id: gender?.id,
          role_id: userRole[0].id
        }).returning();

        // Add 2-3 random interests
        const randomInterests = interestsInDb.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 2);
        for (const interest of randomInterests) {
          await db.insert(userInterests).values({
            user_id: newUser.id,
            interest_id: interest.id
          });
        }

        // Add 1 random relation
        const randomRelation = relationsInDb[Math.floor(Math.random() * relationsInDb.length)];
        await db.insert(userRelations).values({
          user_id: newUser.id,
          relation_id: randomRelation.id
        });

        console.log(`User '${u.name}' (${u.email}) seeded with random interests and relations.`);
      } else {
        console.log(`User '${u.email}' already exists.`);
      }
    }

    console.log("All seeding completed successfully!");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    process.exit(0);
  }
}

seed();
