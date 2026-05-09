export function createExecutionController(executionService) {
  return {
    run: async (request, response) => {
      try {
        response.json(await executionService.run(request.body || {}));
      } catch (error) {
        response.status(400).json({ stdout: "", stderr: error.message, status: "error" });
      }
    }
  };
}
