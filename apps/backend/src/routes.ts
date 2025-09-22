import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { notificationsRouter } from "./notifications";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api
  app.use('/api/notifications', notificationsRouter);

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
