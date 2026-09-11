import { Router } from "express";

export function createCompilerRoutes(compilerController) {
  const router = Router();

  router.post("/run", compilerController.rateLimit, compilerController.run);
  router.post("/submit", compilerController.rateLimit, compilerController.submit);

  return router;
}
