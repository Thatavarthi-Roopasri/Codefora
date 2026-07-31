export const parseExecutionSteps = (rawJson) => {
  try {
    const data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    if (!Array.isArray(data)) {
      throw new Error('Execution steps must be an array');
    }
    // Perform any necessary data normalization here
    return data.map((step, index) => ({
      id: `step-${index}`,
      line: step.line || 0,
      variables: step.variables || {},
      events: step.events || [],
      ...step
    }));
  } catch (error) {
    console.error('Error parsing execution steps:', error);
    return [];
  }
};
