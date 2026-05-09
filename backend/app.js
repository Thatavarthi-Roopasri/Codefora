import cors from "cors";
import express from "express";
import { createAiController } from "./controllers/aiController.js";
import { createExecutionController } from "./controllers/executionController.js";
import { createRoomController } from "./controllers/roomController.js";
import { getEmotions, getEmotionImage, initEmotions } from "./controllers/emotionController.js";
import { createProfileController } from "./controllers/profileController.js";
import { createAccountController } from "./controllers/accountController.js";
import { createCompilerController } from "./controllers/compilerController.js";
import { createAdminController } from "./controllers/adminController.js";
import { createApiRoutes } from "./routes/apiRoutes.js";
import { AiService } from "./services/aiService.js";
import { ExecutionService } from "./services/executionService.js";
import { PistonService } from "./services/pistonService.js";
import { corsOrigin } from "./config/cors.js";

export function createApp({ roomRepository, roomService, profileController }) {
  const app = express();
  const roomController = createRoomController(roomRepository, roomService, profileController);
  const executionController = createExecutionController(new ExecutionService());
  const aiController = createAiController(new AiService());
  const emotionController = { getEmotions, getEmotionImage, initEmotions };
  const accountController = createAccountController();
  const compilerController = createCompilerController(new PistonService());
  const adminController = createAdminController(roomRepository);

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_request, response) => {
    response.json({
      name: "Codefora API",
      status: "running",
      routes: ["/api/health", "/api/rooms", "/api/run", "/api/compiler/run", "/api/ai", "/api/emotions", "/api/admin", "/api/test-network"]
    });
  });

  // Diagnostic route for network testing
  app.get("/api/test-network", async (req, res) => {
    try {
      const response = await fetch("https://www.google.com", { method: "HEAD" });
      res.json({
        success: response.ok,
        status: response.status,
        message: "Server can reach Google.com"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server cannot reach external internet",
        error: error.message
      });
    }
  });

  app.use("/api", createApiRoutes({ 
    roomController, 
    executionController, 
    aiController, 
    emotionController, 
    profileController, 
    accountController, 
    compilerController,
    adminController
  }));

  app.use((request, response) => {
    response.status(404).json({
      error: "Route not found",
      path: request.originalUrl,
      hint: "Use /api/health, /api/rooms, /api/run, /api/compiler/run, /api/ai, or /api/emotions."
    });
  });

  return app;
}
