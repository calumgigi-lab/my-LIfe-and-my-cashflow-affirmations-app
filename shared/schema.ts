import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  profilePictureUrl: text("profile_picture_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  completions: many(affirmationCompletions),
  streaks: many(userStreaks),
  notificationSettings: many(notificationSettings),
  feedbackEntries: many(feedbackEntries),
  monthlyPurchases: many(monthlyPurchases),
  approvedPayments: many(monthlyPurchases, {
    relationName: "approvedByAdmin",
  }),
  auditLogs: many(paymentAuditLog),
}));

export const booklets = pgTable("booklets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  description: text("description"),
  coverColor: text("cover_color").default("#1976D2"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookletsRelations = relations(booklets, ({ many }) => ({
  affirmations: many(affirmations),
}));

export const affirmations = pgTable("affirmations", {
  id: serial("id").primaryKey(),
  bookletId: integer("booklet_id")
    .notNull()
    .references(() => booklets.id),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const affirmationsRelations = relations(affirmations, ({ one, many }) => ({
  booklet: one(booklets, {
    fields: [affirmations.bookletId],
    references: [booklets.id],
  }),
  completions: many(affirmationCompletions),
}));

export const affirmationCompletions = pgTable("affirmation_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  affirmationId: integer("affirmation_id")
    .notNull()
    .references(() => affirmations.id),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  completedDate: date("completed_date").notNull(),
});

export const affirmationCompletionsRelations = relations(
  affirmationCompletions,
  ({ one }) => ({
    user: one(users, {
      fields: [affirmationCompletions.userId],
      references: [users.id],
    }),
    affirmation: one(affirmations, {
      fields: [affirmationCompletions.affirmationId],
      references: [affirmations.id],
    }),
  }),
);

export const userStreaks = pgTable("user_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastActiveDate: date("last_active_date"),
  totalAffirmed: integer("total_affirmed").default(0).notNull(),
});

export const userStreaksRelations = relations(userStreaks, ({ one }) => ({
  user: one(users, {
    fields: [userStreaks.userId],
    references: [users.id],
  }),
}));

export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  enabled: boolean("enabled").default(true).notNull(),
  startHour: integer("start_hour").default(8).notNull(),
  endHour: integer("end_hour").default(21).notNull(),
  intervalMinutes: integer("interval_minutes").default(30).notNull(),
});

export const notificationSettingsRelations = relations(
  notificationSettings,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationSettings.userId],
      references: [users.id],
    }),
  }),
);

export const feedbackEntries = pgTable("feedback_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedbackEntriesRelations = relations(feedbackEntries, ({ one }) => ({
  user: one(users, {
    fields: [feedbackEntries.userId],
    references: [users.id],
  }),
}));

export const monthlyPurchases = pgTable("monthly_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  bookletId: integer("booklet_id")
    .notNull()
    .references(() => booklets.id),
  platform: varchar("platform", { length: 16 }).notNull(),
  productId: text("product_id").notNull(),
  transactionId: text("transaction_id").notNull().unique(),
  amountNaira: integer("amount_naira").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentAuditLog = pgTable("payment_audit_log", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id")
    .notNull()
    .references(() => monthlyPurchases.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentAuditLogRelations = relations(paymentAuditLog, ({ one }) => ({
  payment: one(monthlyPurchases, {
    fields: [paymentAuditLog.paymentId],
    references: [monthlyPurchases.id],
  }),
  user: one(users, {
    fields: [paymentAuditLog.userId],
    references: [users.id],
  }),
}));

export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const monthlyPurchasesRelations = relations(monthlyPurchases, ({ one, many }) => ({
  user: one(users, {
    fields: [monthlyPurchases.userId],
    references: [users.id],
  }),
  booklet: one(booklets, {
    fields: [monthlyPurchases.bookletId],
    references: [booklets.id],
  }),
  approvedByAdmin: one(users, {
    fields: [monthlyPurchases.approvedBy],
    references: [users.id],
    relationName: "approvedByAdmin",
  }),
  auditLogs: many(paymentAuditLog),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  displayName: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Booklet = typeof booklets.$inferSelect;
export type Affirmation = typeof affirmations.$inferSelect;
export type AffirmationCompletion = typeof affirmationCompletions.$inferSelect;
export type UserStreak = typeof userStreaks.$inferSelect;
export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type FeedbackEntry = typeof feedbackEntries.$inferSelect;
export type MonthlyPurchase = typeof monthlyPurchases.$inferSelect;
export type PaymentAuditLog = typeof paymentAuditLog.$inferSelect;
export type AdminSettings = typeof adminSettings.$inferSelect;
