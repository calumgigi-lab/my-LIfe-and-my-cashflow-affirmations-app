import { createServer } from "node:http";
import { createApp } from "./app";

(async () => {
  try {
    const app = await createApp();
    const server = createServer(app);
    const port = parseInt(process.env.PORT || "5000", 10);

    server.listen(port, () => {
      console.log(`✓ Backend server ready on port ${port}`);
      console.log("✓ Database connection initialized");
      process.send?.({ type: "ready", port });
    });

    // Graceful shutdown handler
    process.on("SIGTERM", () => {
      console.log("\n⏹️  Shutting down gracefully...");
      server.close(() => {
        console.log("✓ Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("\n⏹️  Shutting down gracefully...");
      server.close(() => {
        console.log("✓ Server closed");
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("✗ Uncaught Exception:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("✗ Failed to start server:", error);
    process.exit(1);
  }
})();
