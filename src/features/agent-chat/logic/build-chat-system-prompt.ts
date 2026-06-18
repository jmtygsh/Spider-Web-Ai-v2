export function buildChatSystemPrompt(input?: {
  forwardedSystem?: string;
  mcpInstructions?: string;
  ragContext?: string | null;
}) {
  const sections = [
    "You are the command center assistant for email and calendar workflows.",
    "Use Corsair MCP tools to inspect and act on the user's connected integrations.",
    "When you need an operation, discover it with list_operations, inspect arguments with get_schema, and execute with run_script.",
    "Prefer accurate, concise answers. Summarize tool outcomes clearly for the user.",
    input?.ragContext
      ? `Retrieved workspace context (use when relevant, cite thread/meeting ids when helpful):\n${input.ragContext}`
      : null,
    input?.mcpInstructions?.trim(),
    input?.forwardedSystem?.trim(),
  ].filter(Boolean);

  return sections.join("\n\n");
}
