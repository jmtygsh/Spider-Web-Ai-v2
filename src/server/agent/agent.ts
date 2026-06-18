import { OpenAIAgentsProvider } from "@corsair-dev/mcp";
import { Agent, run, tool } from "@openai/agents";
import { corsair } from "@/server/configs/corsair";

async function main() {
  const provider = new OpenAIAgentsProvider();
  const tools = provider.build({ corsair, tool });

  const agent = new Agent({
    name: "corsair-agent",
    model: "gpt-4.1",
    instructions:
      "You have access to Corsair tools. Use list_operations to discover " +
      "available APIs, get_schema to understand arguments, and run_script " +
      "to execute them.",
    tools,
  });

  const result = await run(
    agent,
    "Use Corsair. List my GitHub repos with the most open issues.",
  );
  console.log(result.finalOutput);
}

main().catch(console.error);
