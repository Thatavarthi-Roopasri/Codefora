import { Router } from "express";
import { createCompilerRoutes } from "./compiler.js";
import { adminAuth } from "../middleware/adminAuth.js";

export function createApiRoutes({ roomController, executionController, aiController, emotionController, profileController, accountController, compilerController, adminController }) {
  const router = Router();

  router.get("/health", (_request, response) => response.json({ ok: true }));
  router.get("/rooms", roomController.list);
  router.post("/rooms", roomController.rateLimit, roomController.create);
  router.get("/rooms/invite/:code", roomController.findByInviteCode);
  router.get("/rooms/:id", roomController.get);
  // Profile routes
  if (profileController) {
    router.get("/profiles/:userId", profileController.get);
    router.post("/profiles/:userId", profileController.save);
  }
  if (accountController) {
    router.post("/auth/signup", accountController.signup);
    router.post("/auth/login", accountController.login);
  }
  if (compilerController) {
    router.use("/compiler", createCompilerRoutes(compilerController));
  }
  router.post("/run", executionController.run);
  router.post("/ai", aiController.ask);
  
  // Emotion routes
  router.get("/emotions", emotionController.getEmotions);
  router.get("/emotions/:emotionId/image", emotionController.getEmotionImage);
  router.post("/emotions/init", emotionController.initEmotions);

  // Admin routes (Protected)
  if (adminController) {
    router.get("/admin/stats", adminAuth, adminController.getStats);
    router.get("/admin/rooms", adminAuth, adminController.getRooms);
    router.get("/admin/users", adminAuth, adminController.getUsers);
    router.get("/admin/problems", adminAuth, adminController.getProblems);
    router.delete("/admin/rooms/:id", adminAuth, adminController.deleteRoom);
    router.post("/admin/rooms/:id/lock", adminAuth, adminController.toggleRoomLock);
    router.post("/admin/problems/:id/publish", adminAuth, adminController.publishProblem);
    router.delete("/admin/problems/:id", adminAuth, adminController.deleteProblem);
    router.post("/admin/problems", adminAuth, adminController.addProblem);
    router.put("/admin/problems/:id", adminAuth, adminController.updateProblem);
  }

  return router;
}
