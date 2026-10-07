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
  const draft = id
    ? await retell<{ agent_id: string; version: number }>("PATCH", `${update}/${id}`, config)
    : await retell<{ agent_id: string; version: number }>("POST", create, config);
  console.log(`${id ? "updated" : "created"} ${kind} agent ${draft.agent_id} (draft v${draft.version})`);
  await retell("POST", `/publish-agent-version/${draft.agent_id}`, { version: draft.version });
  console.log(`published ${kind} agent ${draft.agent_id} v${draft.version}`);
  return draft.agent_id;
}

async function main() {
  const llm = agentLlmConfig();
  if (dry) {
    console.log(llm.general_prompt);
    console.log("\n--- llm config (prompt omitted) ---");
    console.log(JSON.stringify({ ...llm, general_prompt: `<${llm.general_prompt.length} chars>` }, null, 2));
    console.log("\n--- voice agent config ---");
    console.log(JSON.stringify(voiceAgentConfig("<llm_id>", 0), null, 2));
    console.log("\n--- chat agent config ---");
    console.log(JSON.stringify(chatAgentConfig("<llm_id>", 0), null, 2));
    return;
  }
  if (!apiKey) throw new Error("RETELL_API_KEY is not set (put it in .env.local)");

  const existingLlm = process.env.RETELL_LLM_ID;
  const { llm_id: llmId, version: llmVersion } = existingLlm
    ? await retell<{ llm_id: string; version: number }>("PATCH", `/update-retell-llm/${existingLlm}`, llm)
    : await retell<{ llm_id: string; version: number }>("POST", "/create-retell-llm", llm);
  console.log(`${existingLlm ? "updated" : "created"} llm ${llmId} (v${llmVersion})`);

  // Both agents pin the same LLM version, so publishing them ships the prompt above to voice and chat at once.
  const agentId = await upsertAgent("voice", process.env.RETELL_AGENT_ID, voiceAgentConfig(llmId, llmVersion));
  const chatAgentId = await upsertAgent("chat", process.env.RETELL_CHAT_AGENT_ID, chatAgentConfig(llmId, llmVersion));
  console.log(`\nMake sure .env.local and Vercel have:\nRETELL_LLM_ID=${llmId}\nRETELL_AGENT_ID=${agentId}\nRETELL_CHAT_AGENT_ID=${chatAgentId}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
