import { useUiStore } from "../store/ui-store";

export type SoundName =
  | "sessionStarted"
  | "sessionPaused"
  | "agentWaiting"
  | "agentDone"
  | "sessionError";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Helper: bubble pop — sine with quick pitch drop and smooth fade */
function bubble(ctx: AudioContext, freq: number, time: number, vol = 0.06, dur = 0.25) {
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.72, time + dur * 0.6);
  osc.connect(gain);
  osc.start(time);
  osc.stop(time + dur);
}

/** Rising double-bubble pop */
function playSessionStarted(ctx: AudioContext) {
  const now = ctx.currentTime;
  bubble(ctx, 396, now, 0.05, 0.22);
  bubble(ctx, 528, now + 0.14, 0.055, 0.28);
}

/** Single soft descending bubble */
function playSessionPaused(ctx: AudioContext) {
  const now = ctx.currentTime;
  bubble(ctx, 352, now, 0.045, 0.3);
}

/** Curious rising "huh?" — low tone sweeping up */
function playAgentWaiting(ctx: AudioContext) {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.045, now + 0.03);
  gain.gain.setValueAtTime(0.045, now + 0.22);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(310, now);        // start low
  osc.frequency.setValueAtTime(300, now + 0.08);  // dip slightly
  osc.frequency.exponentialRampToValueAtTime(480, now + 0.28); // rise up
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.38);
}

/** Gentle two-bubble chord */
function playAgentDone(ctx: AudioContext) {
  const now = ctx.currentTime;
  bubble(ctx, 396, now, 0.04, 0.35);
  bubble(ctx, 528, now + 0.06, 0.04, 0.35);
  bubble(ctx, 660, now + 0.12, 0.035, 0.4);
}

/** Low soft bubble for errors */
function playSessionError(ctx: AudioContext) {
  const now = ctx.currentTime;
  bubble(ctx, 240, now, 0.05, 0.3);
  bubble(ctx, 210, now + 0.15, 0.04, 0.3);
}

const soundFns: Record<SoundName, (ctx: AudioContext) => void> = {
  sessionStarted: playSessionStarted,
  sessionPaused: playSessionPaused,
  agentWaiting: playAgentWaiting,
  agentDone: playAgentDone,
  sessionError: playSessionError,
};

export function playSound(name: SoundName) {
  const state = useUiStore.getState();
  if (!state.soundEnabled) return;
  if (!state.soundSettings[name]) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  soundFns[name](ctx);
}
