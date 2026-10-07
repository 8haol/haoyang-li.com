/**
 * Creates or updates the "Talk to me" agents on Retell from the site's content: one Retell LLM (the prompt)
 * shared by a voice agent and a chat agent.
 *
 *   npm run retell:sync            create/update the LLM and both agents, then publish the agents
 *   npm run retell:sync -- --dry   print the prompt and the config without calling Retell
 *
 * Reads RETELL_API_KEY (required), RETELL_LLM_ID / RETELL_AGENT_ID / RETELL_CHAT_AGENT_ID (update instead of
 * create) and RETELL_VOICE_ID (defaults to a stock voice) from .env.local. Prints the ids to add to .env.local and Vercel.
 */
import { agentLlmConfig, chatAgentConfig, RETELL_API, voiceAgentConfig } from "@/lib/agent/retell";

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

/** Updates the agent when we have its id, creates it otherwise; then publishes it so it picks up the new LLM. */
async function upsertAgent(kind: "voice" | "chat", id: string | undefined, config: object): Promise<string> {
  const [create, update] = kind === "voice" ? ["/create-agent", "/update-agent"] : ["/create-chat-agent", "/update-chat-agent"];
  if (id) {
    await retell("PATCH", `${update}/${id}`, config);
    console.log(`updated ${kind} agent ${id}`);
  } else {
    id = (await retell<{ agent_id: string }>("POST", create, config)).agent_id;
    console.log(`created ${kind} agent ${id}`);
  }
  await retell("POST", `/publish-agent/${id}`);
  console.log(`published ${kind} agent ${id}`);
  return id;
}

async function main() {
  const llm = agentLlmConfig();
  if (dry) {
    console.log(llm.general_prompt);
    console.log("\n--- llm config (prompt omitted) ---");
    console.log(JSON.stringify({ ...llm, general_prompt: `<${llm.general_prompt.length} chars>` }, null, 2));
    console.log("\n--- voice agent config ---");
    console.log(JSON.stringify(voiceAgentConfig("<llm_id>"), null, 2));
    console.log("\n--- chat agent config ---");
    console.log(JSON.stringify(chatAgentConfig("<llm_id>"), null, 2));
    return;
  }
  if (!apiKey) throw new Error("RETELL_API_KEY is not set (put it in .env.local)");

  let llmId = process.env.RETELL_LLM_ID;
  if (llmId) {
    await retell("PATCH", `/update-retell-llm/${llmId}`, llm);
    console.log(`updated llm ${llmId}`);
  } else {
    llmId = (await retell<{ llm_id: string }>("POST", "/create-retell-llm", llm)).llm_id;
    console.log(`created llm ${llmId}`);
  }

  const agentId = await upsertAgent("voice", process.env.RETELL_AGENT_ID, voiceAgentConfig(llmId));
  const chatAgentId = await upsertAgent("chat", process.env.RETELL_CHAT_AGENT_ID, chatAgentConfig(llmId));
  console.log(`\nMake sure .env.local and Vercel have:\nRETELL_LLM_ID=${llmId}\nRETELL_AGENT_ID=${agentId}\nRETELL_CHAT_AGENT_ID=${chatAgentId}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
