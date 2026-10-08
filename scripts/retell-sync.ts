/**
 * Creates or updates the "Talk to me" agents on Retell from the site's content: a voice agent and a chat agent,
 * each with its own Retell LLM, both written from the same prompt.
 *
 *   npm run retell:sync            write a new draft of each agent and its LLM, then publish it
 *   npm run retell:sync -- --dry   print the prompt and the config without calling Retell
 *
 * Reads RETELL_API_KEY (required), RETELL_AGENT_ID + RETELL_LLM_ID and RETELL_CHAT_AGENT_ID + RETELL_CHAT_LLM_ID
 * (update instead of create; set both of a pair or neither) and RETELL_VOICE_ID (defaults to a stock voice) from
 * .env.local. Prints the ids to add to .env.local and Vercel.
 */
import { agentLlmConfig, chatAgentConfig, RETELL_API, voiceAgentConfig, type Channel } from "@/lib/agent/retell";

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

type Version = { version: number; is_published?: boolean };

const AGENTS = {
  voice: {
    env: ["RETELL_AGENT_ID", "RETELL_LLM_ID"],
    paths: { get: "/get-agent", create: "/create-agent", update: "/update-agent", draft: "/create-agent-version" },
    config: (llmId: string, version: number) => voiceAgentConfig(llmId, version),
  },
  chat: {
    env: ["RETELL_CHAT_AGENT_ID", "RETELL_CHAT_LLM_ID"],
    // Drafts of a chat agent come from the same endpoint as voice drafts; there is no /create-chat-agent-version.
    paths: { get: "/get-chat-agent", create: "/create-chat-agent", update: "/update-chat-agent", draft: "/create-agent-version" },
    config: (llmId: string, version: number) => chatAgentConfig(llmId, version),
  },
} as const;

/**
 * Retell versions an agent and its LLM in step (agent v7 runs LLM v7), so a change goes: open a draft if the latest
 * version is published, write the LLM and the agent into that draft, publish it.
 */
async function syncAgent(channel: Channel): Promise<{ agentId: string; llmId: string }> {
  const { env, paths, config } = AGENTS[channel];
  const agentId = process.env[env[0]];
  const llmId = process.env[env[1]];
  const llm = agentLlmConfig(channel);

  if (!agentId || !llmId) {
    if (agentId || llmId) throw new Error(`${channel}: set both ${env.join(" and ")}, or neither to create a new pair`);
    const createdLlm = await retell<{ llm_id: string } & Version>("POST", "/create-retell-llm", llm);
    const created = await retell<{ agent_id: string } & Version>("POST", paths.create, config(createdLlm.llm_id, createdLlm.version));
    await retell("POST", `/publish-agent-version/${created.agent_id}`, { version: created.version });
    console.log(`created and published ${channel} agent ${created.agent_id} v${created.version} with llm ${createdLlm.llm_id}`);
    return { agentId: created.agent_id, llmId: createdLlm.llm_id };
  }

  const latest = await retell<Version>("GET", `${paths.get}/${agentId}`);
  const draft = latest.is_published ? (await retell<Version>("POST", `${paths.draft}/${agentId}`, { base_version: latest.version })).version : latest.version;
  const updatedLlm = await retell<Version>("PATCH", `/update-retell-llm/${llmId}?version=${draft}`, llm);
  if (updatedLlm.version !== draft) throw new Error(`${channel}: llm ${llmId} is at v${updatedLlm.version} but the agent draft is v${draft}`);
  await retell("PATCH", `${paths.update}/${agentId}?version=${draft}`, config(llmId, draft));
  await retell("POST", `/publish-agent-version/${agentId}`, { version: draft });
  console.log(`published ${channel} agent ${agentId} v${draft}`);
  return { agentId, llmId };
}

async function main() {
  if (dry) {
    console.log(agentLlmConfig("voice").general_prompt);
    for (const channel of ["voice", "chat"] as const) {
      const llm = agentLlmConfig(channel);
      console.log(`\n--- ${channel} llm config (prompt omitted) ---`);
      console.log(JSON.stringify({ ...llm, general_prompt: `<${llm.general_prompt.length} chars>` }, null, 2));
      console.log(`\n--- ${channel} agent config ---`);
      console.log(JSON.stringify(AGENTS[channel].config("<llm_id>", 0), null, 2));
    }
    return;
  }
  if (!apiKey) throw new Error("RETELL_API_KEY is not set (put it in .env.local)");

  const voice = await syncAgent("voice");
  const chat = await syncAgent("chat");
  console.log(
    `\nMake sure .env.local and Vercel have:\nRETELL_AGENT_ID=${voice.agentId}\nRETELL_LLM_ID=${voice.llmId}\nRETELL_CHAT_AGENT_ID=${chat.agentId}\nRETELL_CHAT_LLM_ID=${chat.llmId}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
