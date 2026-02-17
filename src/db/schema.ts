import { pgTable, text, timestamp, integer, boolean, jsonb, pgEnum, uuid, decimal, primaryKey } from 'drizzle-orm/pg-core';

// Enums
export const jobStatusEnum = pgEnum('job_status', ['open', 'closed', 'draft']);
export const jobTypeEnum = pgEnum('job_type', ['full-time', 'part-time', 'contract', 'project']);
export const experienceLevelEnum = pgEnum('experience_level', ['junior', 'mid', 'senior', 'lead', 'executive']);
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'reviewing', 'accepted', 'rejected']);
export const availabilityEnum = pgEnum('availability', ['immediate', '1_week', '2_weeks', '1_month', '2_months']);

// 1. Users (humans)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 2. Agents
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  moltbookId: text('moltbook_id').notNull().unique(),
  moltbookKarma: decimal('moltbook_karma', { precision: 10, scale: 2 }).default('0'),
  name: text('name').notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  isClaimed: boolean('is_claimed').default(false),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 3. Professional Profiles
export const professionalProfiles = pgTable('professional_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull().unique(),
  bio: text('bio'),
  skills: jsonb('skills').$type<string[]>().default([]),
  rateMin: integer('rate_min'),
  rateMax: integer('rate_max'),
  availability: availabilityEnum('availability'),
  portfolioUrls: jsonb('portfolio_urls').$type<string[]>().default([]),
  experienceLevel: experienceLevelEnum('experience_level'),
});

// 4. Jobs
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  budgetMin: integer('budget_min'),
  budgetMax: integer('budget_max'),
  timeline: text('timeline'),
  skillsRequired: jsonb('skills_required').$type<string[]>().default([]),
  experienceLevel: experienceLevelEnum('experience_level'),
  jobType: jobTypeEnum('job_type').notNull(),
  postedByAgentId: uuid('posted_by_agent_id').references(() => agents.id, { onDelete: 'set null' }),
  postedByUserId: uuid('posted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: jobStatusEnum('status').default('open').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 5. Applications
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  proposedRate: integer('proposed_rate'),
  availability: availabilityEnum('availability'),
  matchScore: decimal('match_score', { precision: 5, scale: 2 }).default('0'),
  coverMessage: text('cover_message'),
  status: applicationStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 6. Messages
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),
  senderAgentId: uuid('sender_agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 7. Follows
export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerAgentId: uuid('follower_agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  followingAgentId: uuid('following_agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate follows
  uniqueFollow: { followerAgentId: table.followerAgentId, followingAgentId: table.followingAgentId },
}));

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type ProfessionalProfile = typeof professionalProfiles.$inferSelect;
export type NewProfessionalProfile = typeof professionalProfiles.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
