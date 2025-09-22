import { type User, type InsertUser, users } from "@shared/schema/users";
import { randomUUID } from "crypto";

// Try to import postgres and drizzle, make them optional
let postgres: any = null;
let drizzle: any = null;
let eq: any = null;

try {
  postgres = require("postgres");
  const drizzleModule = require("drizzle-orm/postgres-js");
  const drizzleOrmModule = require("drizzle-orm");
  drizzle = drizzleModule.drizzle;
  eq = drizzleOrmModule.eq;
} catch (error) {
  console.warn('Postgres/Drizzle not available - using in-memory storage only');
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class DrizzleStorage implements IStorage {
  private db: any;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for DrizzleStorage");
    }
    if (!postgres || !drizzle) {
      throw new Error("Postgres/Drizzle dependencies not available");
    }
    const client = postgres(process.env.DATABASE_URL);
    this.db = drizzle(client);
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by username:', error);
      throw new Error('Failed to fetch user by username');
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await this.db.insert(users).values(insertUser).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }
}

// Fallback MemStorage for development
export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

// Use DrizzleStorage in production, MemStorage for development
export const storage = (process.env.DATABASE_URL && postgres && drizzle)
  ? new DrizzleStorage()
  : new MemStorage();
