import {
  users,
  booklets,
  affirmations,
  affirmationCompletions,
  userStreaks,
  notificationSettings,
  feedbackEntries,
  monthlyPurchases,
  type User,
  type InsertUser,
  type Booklet,
  type Affirmation,
  type AffirmationCompletion,
  type UserStreak,
  type NotificationSetting,
  type FeedbackEntry,
  type MonthlyPurchase,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateProfilePicture(userId: number, pictureUrl: string): Promise<User>;

  getBooklets(): Promise<Booklet[]>;
  getBooklet(id: number): Promise<Booklet | undefined>;

  getAffirmationsByBooklet(bookletId: number): Promise<Affirmation[]>;
  getAffirmation(id: number): Promise<Affirmation | undefined>;
  getTodayAffirmation(month: number, day: number): Promise<(Affirmation & { bookletTitle: string }) | undefined>;

  markAffirmationComplete(
    userId: number,
    affirmationId: number,
    date: string,
  ): Promise<AffirmationCompletion>;
  getCompletions(
    userId: number,
    date?: string,
  ): Promise<AffirmationCompletion[]>;
  isAffirmationCompleted(
    userId: number,
    affirmationId: number,
    date: string,
  ): Promise<boolean>;

  getOrCreateStreak(userId: number): Promise<UserStreak>;
  updateStreak(userId: number, date: string): Promise<UserStreak>;

  getNotificationSettings(userId: number): Promise<NotificationSetting | undefined>;
  upsertNotificationSettings(
    userId: number,
    settings: Partial<NotificationSetting>,
  ): Promise<NotificationSetting>;

  createFeedback(
    userId: number,
    subject: string,
    message: string,
  ): Promise<FeedbackEntry>;

  hasBookletAccess(userId: number, bookletId: number): Promise<boolean>;
  getUnlockedBookletIds(userId: number): Promise<number[]>;
  recordMonthlyPurchase(input: {
    userId: number;
    bookletId: number;
    platform: string;
    productId: string;
    transactionId: string;
    amountNaira?: number;
  }): Promise<MonthlyPurchase>;

  getUserStats(userId: number): Promise<{
    totalAffirmed: number;
    currentStreak: number;
    longestStreak: number;
    completedToday: boolean;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateProfilePicture(userId: number, pictureUrl: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ profilePictureUrl: pictureUrl })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getBooklets(): Promise<Booklet[]> {
    return db.select().from(booklets).orderBy(booklets.year, booklets.month);
  }

  async getBooklet(id: number): Promise<Booklet | undefined> {
    const [booklet] = await db
      .select()
      .from(booklets)
      .where(eq(booklets.id, id));
    return booklet || undefined;
  }

  async getAffirmationsByBooklet(bookletId: number): Promise<Affirmation[]> {
    return db
      .select()
      .from(affirmations)
      .where(eq(affirmations.bookletId, bookletId))
      .orderBy(affirmations.dayNumber);
  }

  async getAffirmation(id: number): Promise<Affirmation | undefined> {
    const [aff] = await db
      .select()
      .from(affirmations)
      .where(eq(affirmations.id, id));
    return aff || undefined;
  }

  async getTodayAffirmation(
    month: number,
    day: number,
  ): Promise<(Affirmation & { bookletTitle: string }) | undefined> {
    const results = await db
      .select({
        id: affirmations.id,
        bookletId: affirmations.bookletId,
        dayNumber: affirmations.dayNumber,
        title: affirmations.title,
        content: affirmations.content,
        imageUrl: affirmations.imageUrl,
        createdAt: affirmations.createdAt,
        bookletTitle: booklets.title,
        bookletMonth: booklets.month,
        bookletYear: booklets.year,
      })
      .from(affirmations)
      .innerJoin(booklets, eq(affirmations.bookletId, booklets.id))
      .where(
        and(eq(booklets.month, month), eq(affirmations.dayNumber, day)),
      )
      .limit(1);

    return results[0] || undefined;
  }

  async markAffirmationComplete(
    userId: number,
    affirmationId: number,
    date: string,
  ): Promise<AffirmationCompletion> {
    const existing = await this.isAffirmationCompleted(
      userId,
      affirmationId,
      date,
    );
    if (existing) {
      const [comp] = await db
        .select()
        .from(affirmationCompletions)
        .where(
          and(
            eq(affirmationCompletions.userId, userId),
            eq(affirmationCompletions.affirmationId, affirmationId),
            eq(affirmationCompletions.completedDate, date),
          ),
        );
      return comp;
    }

    const [completion] = await db
      .insert(affirmationCompletions)
      .values({ userId, affirmationId, completedDate: date })
      .returning();

    await this.updateStreak(userId, date);
    return completion;
  }

  async getCompletions(
    userId: number,
    date?: string,
  ): Promise<AffirmationCompletion[]> {
    if (date) {
      return db
        .select()
        .from(affirmationCompletions)
        .where(
          and(
            eq(affirmationCompletions.userId, userId),
            eq(affirmationCompletions.completedDate, date),
          ),
        );
    }
    return db
      .select()
      .from(affirmationCompletions)
      .where(eq(affirmationCompletions.userId, userId))
      .orderBy(desc(affirmationCompletions.completedAt));
  }

  async isAffirmationCompleted(
    userId: number,
    affirmationId: number,
    date: string,
  ): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(affirmationCompletions)
      .where(
        and(
          eq(affirmationCompletions.userId, userId),
          eq(affirmationCompletions.affirmationId, affirmationId),
          eq(affirmationCompletions.completedDate, date),
        ),
      );
    return (result?.count ?? 0) > 0;
  }

  async getOrCreateStreak(userId: number): Promise<UserStreak> {
    const [existing] = await db
      .select()
      .from(userStreaks)
      .where(eq(userStreaks.userId, userId));
    if (existing) return existing;

    const [streak] = await db
      .insert(userStreaks)
      .values({ userId, currentStreak: 0, longestStreak: 0, totalAffirmed: 0 })
      .returning();
    return streak;
  }

  async updateStreak(userId: number, date: string): Promise<UserStreak> {
    const streak = await this.getOrCreateStreak(userId);
    const today = new Date(date);
    const lastActive = streak.lastActiveDate
      ? new Date(streak.lastActiveDate)
      : null;

    let newCurrent = streak.currentStreak;

    if (lastActive) {
      const diffTime = today.getTime() - lastActive.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newCurrent = streak.currentStreak + 1;
      } else if (diffDays === 0) {
        newCurrent = streak.currentStreak;
      } else {
        newCurrent = 1;
      }
    } else {
      newCurrent = 1;
    }

    const newLongest = Math.max(streak.longestStreak, newCurrent);

    const [updated] = await db
      .update(userStreaks)
      .set({
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastActiveDate: date,
        totalAffirmed: streak.totalAffirmed + 1,
      })
      .where(eq(userStreaks.userId, userId))
      .returning();

    return updated;
  }

  async getNotificationSettings(
    userId: number,
  ): Promise<NotificationSetting | undefined> {
    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));
    return settings || undefined;
  }

  async upsertNotificationSettings(
    userId: number,
    settings: Partial<NotificationSetting>,
  ): Promise<NotificationSetting> {
    const existing = await this.getNotificationSettings(userId);

    if (existing) {
      const [updated] = await db
        .update(notificationSettings)
        .set(settings)
        .where(eq(notificationSettings.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(notificationSettings)
      .values({
        userId,
        enabled: settings.enabled ?? true,
        startHour: settings.startHour ?? 8,
        endHour: settings.endHour ?? 21,
        intervalMinutes: settings.intervalMinutes ?? 30,
      })
      .returning();
    return created;
  }

  async createFeedback(
    userId: number,
    subject: string,
    message: string,
  ): Promise<FeedbackEntry> {
    const [feedback] = await db
      .insert(feedbackEntries)
      .values({
        userId,
        subject,
        message,
      })
      .returning();

    return feedback;
  }

  async hasBookletAccess(userId: number, bookletId: number): Promise<boolean> {
    const [match] = await db
      .select({ id: monthlyPurchases.id })
      .from(monthlyPurchases)
      .where(
        and(
          eq(monthlyPurchases.userId, userId),
          eq(monthlyPurchases.bookletId, bookletId),
          eq(monthlyPurchases.status, "approved"),
        ),
      )
      .limit(1);

    return !!match;
  }

  async getUnlockedBookletIds(userId: number): Promise<number[]> {
    const rows = await db
      .select({ bookletId: monthlyPurchases.bookletId })
      .from(monthlyPurchases)
      .where(
        and(
          eq(monthlyPurchases.userId, userId),
          eq(monthlyPurchases.status, "approved"),
        ),
      );

    return [...new Set(rows.map((row) => row.bookletId))];
  }

  async recordMonthlyPurchase(input: {
    userId: number;
    bookletId: number;
    platform: string;
    productId: string;
    transactionId: string;
    amountNaira?: number;
  }): Promise<MonthlyPurchase> {
    const [purchase] = await db
      .insert(monthlyPurchases)
      .values({
        userId: input.userId,
        bookletId: input.bookletId,
        platform: input.platform,
        productId: input.productId,
        transactionId: input.transactionId,
        amountNaira: input.amountNaira || 0,
        status: "pending",
      })
      .onConflictDoNothing({ target: monthlyPurchases.transactionId })
      .returning();

    if (purchase) {
      return purchase;
    }

    const [existing] = await db
      .select()
      .from(monthlyPurchases)
      .where(eq(monthlyPurchases.transactionId, input.transactionId))
      .limit(1);

    if (!existing) {
      throw new Error("Could not persist purchase");
    }

    return existing;
  }

  async getUserStats(userId: number): Promise<{
    totalAffirmed: number;
    currentStreak: number;
    longestStreak: number;
    completedToday: boolean;
  }> {
    const streak = await this.getOrCreateStreak(userId);
    const today = new Date().toISOString().split("T")[0];
    const todayCompletions = await this.getCompletions(userId, today);

    return {
      totalAffirmed: streak.totalAffirmed,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      completedToday: todayCompletions.length > 0,
    };
  }
}

export const storage = new DatabaseStorage();
