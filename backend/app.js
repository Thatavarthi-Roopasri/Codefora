import cors from "cors";
import express from "express";
import { createAiController } from "./controllers/aiController.js";
import { createExecutionController } from "./controllers/executionController.js";
import { createRoomController } from "./controllers/roomController.js";
import { createRoomProjectController } from "./controllers/roomProjectController.js";
import { getEmotions, getEmotionImage, initEmotions } from "./controllers/emotionController.js";

import { createCompilerController } from "./controllers/compilerController.js";
import { createAdminController } from "./controllers/adminController.js";
import { createProblemController } from "./controllers/problemController.js";
import { createFeedbackController } from "./controllers/feedbackController.js";
import { createNotificationController } from "./controllers/notificationController.js";
import { createDirectMessageController } from "./controllers/directMessageController.js";
import { createApiRoutes } from "./routes/apiRoutes.js";
import { AiService } from "./services/aiService.js";
import { ExecutionService } from "./services/executionService.js";
import { PistonService } from "./services/pistonService.js";
import { ProblemJudgeService } from "./services/problemJudgeService.js";
import { SubmissionService } from "./services/submissionService.js";
import { AdminAuditService } from "./services/adminAuditService.js";
import { corsOrigin } from "./config/cors.js";

export function createApp({ roomRepository, roomService, profileController, onRoomCreated, collabDocs }) {
  const app = express();
  const roomController = createRoomController(roomRepository, roomService, profileController, onRoomCreated);
  const roomProjectController = createRoomProjectController({ roomRepository, roomService, profileController, collabDocs });
  const executionController = createExecutionController(new ExecutionService());
  const aiController = createAiController(new AiService());
  const emotionController = { getEmotions, getEmotionImage, initEmotions };
  const pistonService = new PistonService();
  const submissionService = new SubmissionService();
  const auditService = new AdminAuditService();
  const compilerController = createCompilerController(pistonService, new ProblemJudgeService(pistonService), submissionService);
  const adminController = createAdminController(roomRepository, { submissionService, auditService });
  const problemController = createProblemController();
  const feedbackController = createFeedbackController({ auditService });
  const notificationController = createNotificationController({ auditService });
  const directMessageController = createDirectMessageController();

  app.set('trust proxy', 1);
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_request, response) => {
    response.json({
      name: "Codefora API",
      status: "running",
      routes: ["/api/health", "/api/rooms", "/api/run", "/api/compiler/run", "/api/ai", "/api/emotions", "/api/admin", "/api/feedback", "/api/test-network"]
    });
  });

  // Diagnostic route for network testing
  app.get("/api/test-network", async (req, res) => {
    // Replaced hardcoded google.com fetch with a simple health check 
    // to prevent failures in air-gapped or restricted CI/CD environments.
    res.json({
      success: true,
      status: 200,
      message: "Network diagnostic endpoint reached successfully"
    });
  });

  app.use("/api", createApiRoutes({ 
    roomController, 
    roomProjectController,
    roomRepository,
    executionController, 
    aiController, 
    emotionController, 
    profileController, 
    compilerController,
    adminController,
    problemController,
    feedbackController,
    notificationController
    ,directMessageController
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
