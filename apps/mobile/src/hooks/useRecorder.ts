import { useEffect, useState } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import type { RecordingOptions } from "expo-audio";

const RECORD_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export type RecorderPhase = "idle" | "recording" | "paused" | "stopped";

export interface RecorderFlow {
  phase: RecorderPhase;
  /** elapsed recording time (frozen while paused/stopped) */
  durationMs: number;
  /** normalized live input level 0..1 (metering dB) */
  level: number;
  recordingUri: string | null;
  fileSize: number;
  micDenied: boolean;
  dismissMicDenied: () => void;
  playerPlaying: boolean;
  playerTimeMs: number;
  togglePlayback: () => void;
  start: () => Promise<void>;
  pause: () => void;
  stop: () => Promise<void>;
  discard: () => void;
}

/**
 * Shared recording flow for the Composer (S4) and quick Capture (S11).
 *
 * Deviation from web (documented in migration notes): expo-audio's
 * AudioRecorder has pause() but no resume() — from the paused state the user
 * can Stop or Discard.
 */
export function useRecorderFlow(): RecorderFlow {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordDurationMs, setRecordDurationMs] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [micDenied, setMicDenied] = useState(false);

  const recorder = useAudioRecorder(RECORD_OPTIONS);
  const recState = useAudioRecorderState(recorder, 100);
  const player = useAudioPlayer(recordingUri ?? undefined);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (recordingUri) player.replace(recordingUri);
  }, [recordingUri, player]);

  const level =
    recState.metering !== undefined ? Math.max(0.04, Math.min(1, (recState.metering + 50) / 50)) : 0.04;

  const start = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setMicDenied(true);
      return;
    }
    setRecordDurationMs(0);
    setPhase("recording");
    recorder.record();
  };

  const pause = () => {
    recorder.pause();
    setPhase("paused");
  };

  const stop = async () => {
    const durationMs = recState.durationMillis;
    const size = recState.fileSize;
    await recorder.stop();
    const uri = recorder.uri;
    if (uri) {
      setRecordingUri(uri);
      setRecordDurationMs(durationMs);
      setFileSize(size);
      setPhase("stopped");
    } else {
      setPhase("idle");
    }
  };

  const discard = () => {
    if (phase === "recording" || phase === "paused") {
      void recorder.stop().catch(() => undefined);
    }
    player.pause();
    setRecordingUri(null);
    setRecordDurationMs(0);
    setFileSize(0);
    setPhase("idle");
  };

  const togglePlayback = () => {
    if (playerStatus?.playing) player.pause();
    else player.play();
  };

  return {
    phase,
    durationMs: phase === "stopped" ? recordDurationMs : recState.durationMillis,
    level,
    recordingUri,
    fileSize,
    micDenied,
    dismissMicDenied: () => setMicDenied(false),
    playerPlaying: Boolean(playerStatus?.playing),
    playerTimeMs: Math.round((playerStatus?.currentTime ?? 0) * 1000),
    togglePlayback,
    start,
    pause,
    stop,
    discard,
  };
}
