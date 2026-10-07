import { buildAgentPrompt, VOICE_BEGIN_MESSAGE } from "@/lib/agent/prompt";

export const RETELL_API = "https://api.retellai.com";

export type Channel = "voice" | "chat";

/** A channel is live only when the key and that channel's agent are configured. */
export function retellConfig(channel: Channel = "voice", env: NodeJS.ProcessEnv = process.env): { apiKey: string; agentId: string } | null {
  const apiKey = env.RETELL_API_KEY;
  const agentId = channel === "chat" ? env.RETELL_CHAT_AGENT_ID : env.RETELL_AGENT_ID;
  return apiKey && agentId ? { apiKey, agentId } : null;
}

/** Values Retell substitutes for {{channel}} and {{locale}} in the shared prompt. */
export const sessionVariables = (channel: Channel, locale: string) => ({ channel, locale });

/** Fields a browser may not set on the forwarded create-web-call request. */
const FORBIDDEN_BODY_KEYS = ["agent_id", "agent_override", "agent_version", "retell_llm_dynamic_variables"] as const;

/**
 * Builds the body forwarded to Retell's create-web-call: whatever the SDK sent, minus anything that could point
 * the call at another agent or rewrite the prompt, plus our agent id, the session variables and a little metadata.
 */
export function webCallBody(incoming: unknown, agentId: string, locale: string, metadata: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? { ...(incoming as Record<string, unknown>) } : {};
  for (const k of FORBIDDEN_BODY_KEYS) delete body[k];
  const existing = body.metadata && typeof body.metadata === "object" ? (body.metadata as Record<string, unknown>) : {};
  return { ...body, agent_id: agentId, retell_llm_dynamic_variables: sessionVariables("voice", locale), metadata: { ...existing, ...metadata } };
}

/** Body for Retell's create-chat: always our chat agent, never anything the browser chose. */
export function chatBody(agentId: string, locale: string, metadata: Record<string, string>) {
  return { agent_id: agentId, retell_llm_dynamic_variables: sessionVariables("chat", locale), metadata };
}

type ChatMessage = { role?: string; content?: unknown };

/** The visitor-facing text of a create-chat-completion response: the agent's messages, tool traffic dropped. */
export function agentReply(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  return (messages as ChatMessage[])
    .filter((m) => m?.role === "agent" && typeof m.content === "string" && m.content.trim())
    .map((m) => (m.content as string).trim())
    .join("\n\n");
}

/**
 * Retell LLM (the "brain") settings. Retell versions an agent and its LLM together, so each agent has its own LLM,
 * but both are written from here with the same prompt and model. Synced by `npm run retell:sync`.
 */
export function agentLlmConfig(channel: Channel) {
  const shared = {
    model: "gpt-5.6-terra",
    model_high_priority: false,
    model_temperature: 0.5,
    general_prompt: buildAgentPrompt(),
    default_dynamic_variables: sessionVariables(channel, "en"),
  };
  if (channel === "chat") return { ...shared, start_speaker: "user", general_tools: [] };
  return {
    ...shared,
    start_speaker: "agent",
    begin_message: VOICE_BEGIN_MESSAGE,
    general_tools: [
      {
        type: "end_call",
        name: "end_call",
        description: "End the call once the visitor has said goodbye or the conversation has clearly wrapped up.",
      },
    ],
  };
}

/** Post-session extraction, the same for calls and chats so the summaries read alike. */
const ANALYSIS_FIELDS = [
  { type: "string", name: "visitor_name", description: "The visitor's name if they gave one.", examples: ["Sam", "a recruiter from a London startup"] },
  { type: "string", name: "visitor_intent", description: "Why they got in touch: hiring, collaboration, curiosity, something else.", examples: ["recruiter screening for an FDE role", "engineer curious about GAIMS"] },
  { type: "string", name: "follow_up", description: "Anything Haoyang should follow up on by email, or 'none'.", examples: ["send CV to the visitor", "none"] },
];

/** Retell requires an agent version to run the LLM version with the same number. */
const responseEngine = (llmId: string, version: number) => ({ type: "retell-llm", llm_id: llmId, version });

/** Retell voice agent (voice, turn-taking, limits) settings. Synced by `npm run retell:sync`. */
export function voiceAgentConfig(llmId: string, version: number, voiceId = process.env.RETELL_VOICE_ID ?? "11labs-Adrian") {
  return {
    agent_name: "Haoyang Li — haoyang-li.com",
    response_engine: responseEngine(llmId, version),
    voice_id: voiceId,
    voice_temperature: 1,
    voice_speed: 1,
    enable_dynamic_voice_speed: true,
    language: "en-GB",
    responsiveness: 1,
    interruption_sensitivity: 0.9,
    enable_backchannel: true,
    backchannel_frequency: 0.6,
    backchannel_words: ["mm-hmm", "yeah", "right", "got it"],
    denoising_mode: "noise-cancellation",
    end_call_after_silence_ms: 45_000,
    max_call_duration_ms: 15 * 60 * 1000,
    post_call_analysis_data: ANALYSIS_FIELDS,
  };
}

/** Retell chat agent settings: the same prompt as the voice agent, typed instead of spoken. Synced by `npm run retell:sync`. */
export function chatAgentConfig(llmId: string, version: number) {
  return {
    agent_name: "Haoyang Li — haoyang-li.com (chat)",
    response_engine: responseEngine(llmId, version),
    language: ["en-GB", "zh-CN"],
    end_chat_after_silence_ms: 30 * 60 * 1000,
    post_chat_analysis_data: ANALYSIS_FIELDS,
  };
}
