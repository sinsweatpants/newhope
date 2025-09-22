import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import minimist from 'minimist';
import * as functions from 'firebase-functions';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware and other app setup...
(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // In production (Firebase), Express app is exported. 
    // Static serving is handled by Firebase Hosting.
  }

  // Only listen on a port when running in a local development environment
  if (process.env.NODE_ENV === 'development') {
    const argv = minimist(process.argv.slice(2));
    const port = parseInt(argv.port || process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  }
})();

// Export the Express API as a Firebase Function
export const api = functions.https.onRequest(app);
