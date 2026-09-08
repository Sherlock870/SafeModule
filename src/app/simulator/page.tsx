"use client";

import { useEffect, useRef, useState } from "react";

type DeviceType = "BAG_CLIP" | "NECKLACE";

const DEVICE_ID_KEY_PREFIX = "safemodule_device_id_";
const STREAM_INTERVAL_MS = 2000;
const SPIKE_TICKS = 5;

function randomInRange(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}

export default function SimulatorPage() {
  const [deviceIds, setDeviceIds] = useState<Record<DeviceType, string> | null>(null);
  const [mode, setMode] = useState<DeviceType>("BAG_CLIP");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [readings, setReadings] = useState<number[]>([]);
  const spikeTicksRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ids = (["BAG_CLIP", "NECKLACE"] as const).reduce((acc, type) => {
      const key = `${DEVICE_ID_KEY_PREFIX}${type}`;
      let id = localStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(key, id);
      }
      acc[type] = id;
      return acc;
    }, {} as Record<DeviceType, string>);
    setDeviceIds(ids);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function sendAlert(triggerType: "MANUAL_SOS" | "VOICE_DISTRESS") {
    if (!deviceIds || sending) return;
    setSending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: deviceIds[mode],
          deviceType: mode,
          triggerType,
          latitude: location?.latitude,
          longitude: location?.longitude,
          locationLabel: location ? undefined : "Location unavailable",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to send alert.");
        return;
      }

      setMessage(`Alert sent — incident #${data.alert.id.slice(0, 8)} created.`);
    } catch {
      setMessage("Failed to reach the server.");
    } finally {
      setSending(false);
    }
  }

  function startStreaming() {
    if (!deviceIds || streaming) return;
    setStreaming(true);
    const necklaceId = deviceIds.NECKLACE;
    intervalRef.current = setInterval(async () => {
      const spiking = spikeTicksRef.current > 0;
      const heartRate = spiking ? randomInRange(140, 170) : randomInRange(70, 90);
      if (spiking) spikeTicksRef.current -= 1;

      setReadings((prev) => [heartRate, ...prev].slice(0, 5));

      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: necklaceId,
          deviceType: "NECKLACE",
          heartRate,
        }),
      }).catch(() => {});
    }, STREAM_INTERVAL_MS);
  }

  function stopStreaming() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setStreaming(false);
  }

  function spikeHeartRate() {
    if (!streaming) return;
    spikeTicksRef.current = SPIKE_TICKS;
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-black/10 p-6 dark:border-white/10">
        <div>
          <h1 className="text-xl font-semibold">Device Simulator</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Stand-in for the physical SafeModule wearable.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("BAG_CLIP")}
            className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
              mode === "BAG_CLIP"
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/20 dark:border-white/20"
            }`}
          >
            Bag / Clip
          </button>
          <button
            type="button"
            onClick={() => setMode("NECKLACE")}
            className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
              mode === "NECKLACE"
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/20 dark:border-white/20"
            }`}
          >
            Necklace
          </button>
        </div>

        {mode === "BAG_CLIP" && (
          <div className="space-y-4">
            <button
              type="button"
              disabled={!deviceIds || sending}
              onClick={() => sendAlert("MANUAL_SOS")}
              className="w-full rounded-lg bg-red-600 py-6 text-lg font-semibold text-white disabled:opacity-50"
            >
              SOS
            </button>
          </div>
        )}

        {mode === "NECKLACE" && (
          <div className="space-y-4">
            <button
              type="button"
              disabled={!deviceIds || sending}
              onClick={() => sendAlert("VOICE_DISTRESS")}
              className="w-full rounded-lg bg-red-600 py-4 text-base font-semibold text-white disabled:opacity-50"
            >
              Say distress phrase
            </button>

            <div className="space-y-2 rounded border border-black/10 p-3 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Heart-rate telemetry</span>
                <button
                  type="button"
                  disabled={!deviceIds}
                  onClick={streaming ? stopStreaming : startStreaming}
                  className="rounded border border-black/20 px-2 py-1 text-xs font-medium dark:border-white/20"
                >
                  {streaming ? "Stop wearing" : "Start wearing"}
                </button>
              </div>

              <button
                type="button"
                disabled={!streaming}
                onClick={spikeHeartRate}
                className="w-full rounded border border-black/20 px-2 py-1 text-xs font-medium disabled:opacity-40 dark:border-white/20"
              >
                Spike heart rate
              </button>

              <p className="text-xs text-black/60 dark:text-white/60">
                {readings.length
                  ? `Last readings: ${readings.join(", ")} bpm`
                  : "No readings yet."}
              </p>
            </div>
          </div>
        )}

        {message && <p className="text-sm">{message}</p>}
      </div>
    </div>
  );
}
