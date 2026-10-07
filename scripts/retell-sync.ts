/**
 * Creates or updates the "Talk to me" voice agent on Retell from the site's content.
 *
 *   npm run retell:sync            create/update the Retell LLM + agent and publish it
 *   npm run retell:sync -- --dry   print the prompt and the config without calling Retell
 *
 * Reads RETELL_API_KEY (required), RETELL_LLM_ID / RETELL_AGENT_ID (update instead of create) and
 * RETELL_VOICE_ID (defaults to a stock voice) from .env.local. Prints the ids to add to .env.local and Vercel.
 */
import { RETELL_API, voiceAgentConfig, voiceLlmConfig } from "@/lib/agent/retell";

const dry = process.argv.includes("--dry");
const apiKey = process.env.RETELL_API_KEY;

async function retell<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${RETELL_API}${path}`, {
    method,
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

async function main() {
  const llm = voiceLlmConfig();
  if (dry) {
    console.log(llm.general_prompt);
    console.log("\n--- llm config (prompt omitted) ---");
    console.log(JSON.stringify({ ...llm, general_prompt: `<${llm.general_prompt.length} chars>` }, null, 2));
    console.log("\n--- agent config ---");
    console.log(JSON.stringify(voiceAgentConfig("<llm_id>"), null, 2));
    return;
  }
  if (!apiKey) throw new Error("RETELL_API_KEY is not set (put it in .env.local)");

  let llmId = process.env.RETELL_LLM_ID;
  if (llmId) {
    await retell("PATCH", `/update-retell-llm/${llmId}`, llm);
    console.log(`updated llm ${llmId}`);
  } else {
    const created = await retell<{ llm_id: string }>("POST", "/create-retell-llm", llm);
    llmId = created.llm_id;
    console.log(`created llm ${llmId}`);
  }

  const agent = voiceAgentConfig(llmId);
  let agentId = process.env.RETELL_AGENT_ID;
  if (agentId) {
    await retell("PATCH", `/update-agent/${agentId}`, agent);
    console.log(`updated agent ${agentId}`);
  } else {
    const created = await retell<{ agent_id: string }>("POST", "/create-agent", agent);
    agentId = created.agent_id;
    console.log(`created agent ${agentId}`);
  }

  await retell("POST", `/publish-agent/${agentId}`);
  console.log(`published agent ${agentId}`);
  console.log(`\nMake sure .env.local and Vercel have:\nRETELL_LLM_ID=${llmId}\nRETELL_AGENT_ID=${agentId}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
