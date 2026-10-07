import { buildVoicePrompt, VOICE_BEGIN_MESSAGE } from "@/lib/agent/voicePrompt";

export const RETELL_API = "https://api.retellai.com";

/** The voice line is live only when both the key and the agent are configured. */
export function retellConfig(env: NodeJS.ProcessEnv = process.env): { apiKey: string; agentId: string } | null {
  const apiKey = env.RETELL_API_KEY;
  const agentId = env.RETELL_AGENT_ID;
  return apiKey && agentId ? { apiKey, agentId } : null;
}

/** Fields a browser may not set on the forwarded create-web-call request. */
const FORBIDDEN_BODY_KEYS = ["agent_id", "agent_override", "agent_version", "retell_llm_dynamic_variables"] as const;

/**
 * Builds the body forwarded to Retell's create-web-call: whatever the SDK sent, minus anything that could point
 * the call at another agent or rewrite the prompt, plus our agent id and a little metadata.
 */
export function webCallBody(incoming: unknown, agentId: string, metadata: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? { ...(incoming as Record<string, unknown>) } : {};
  for (const k of FORBIDDEN_BODY_KEYS) delete body[k];
  const existing = body.metadata && typeof body.metadata === "object" ? (body.metadata as Record<string, unknown>) : {};
  return { ...body, agent_id: agentId, metadata: { ...existing, ...metadata } };
}

/** Retell LLM (the "brain") settings. Synced by `npm run retell:sync`. */
export function voiceLlmConfig() {
  return {
    model: "claude-5.5-sonnet",
    model_high_priority: true,
    model_temperature: 0.5,
    begin_message: VOICE_BEGIN_MESSAGE,
    general_prompt: buildVoicePrompt(),
    general_tools: [
      {
        type: "end_call",
        name: "end_call",
        description: "End the call once the visitor has said goodbye or the conversation has clearly wrapped up.",
      },
    ],
  };
}

/** Retell agent (voice, turn-taking, limits) settings. Synced by `npm run retell:sync`. */
export function voiceAgentConfig(llmId: string, voiceId = process.env.RETELL_VOICE_ID ?? "11labs-Adrian") {
  return {
    agent_name: "Haoyang Li — haoyang-li.com",
    response_engine: { type: "retell-llm", llm_id: llmId },
    voice_id: voiceId,
    voice_temperature: 1,
    voice_speed: 1,
    enable_dynamic_voice_speed: true,
    language: "en-US",
    responsiveness: 1,
    interruption_sensitivity: 0.9,
    enable_backchannel: true,
    backchannel_frequency: 0.6,
    backchannel_words: ["mm-hmm", "yeah", "right", "got it"],
    denoising_mode: "noise-cancellation",
    end_call_after_silence_ms: 45_000,
    max_call_duration_ms: 15 * 60 * 1000,
    post_call_analysis_data: [
      { type: "string", name: "visitor_name", description: "The visitor's name if they gave one.", examples: ["Sam", "a recruiter from a London startup"] },
      { type: "string", name: "visitor_intent", description: "Why they called: hiring, collaboration, curiosity, something else.", examples: ["recruiter screening for an FDE role", "engineer curious about GAIMS"] },
      { type: "string", name: "follow_up", description: "Anything Haoyang should follow up on by email, or 'none'.", examples: ["send CV to the visitor", "none"] },
    ],
  };
}
