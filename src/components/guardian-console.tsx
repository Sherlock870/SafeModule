"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type Telemetry = {
  id: string;
  heartRate: number;
  recordedAt: string;
};

type AlertRecord = {
  id: string;
  device: { id: string; type: "BAG_CLIP" | "NECKLACE"; label: string };
  triggerType: "MANUAL_SOS" | "VOICE_DISTRESS";
  status: "ACTIVE" | "RESOLVED" | "CANCELLED";
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  createdAt: string;
  aiStatus: "PENDING" | "ANALYZING" | "DONE_LLM" | "DONE_FALLBACK" | "FAILED";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  riskConfidence: number | null;
  triggeringSignals: string[] | null;
  rationale: string | null;
  recommendedAction: string | null;
  aiSource: "llm" | "fallback" | null;
  sourceLabel: string | null;
  recentTelemetry: Telemetry[];
};

const POLL_INTERVAL_MS = 3000;

const RISK_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-400 text-black",
  LOW: "bg-green-500 text-white",
};

function riskBadge(alert: AlertRecord) {
  if (alert.aiStatus === "PENDING" || alert.aiStatus === "ANALYZING") {
    return <span className="rounded px-2 py-1 text-xs font-medium bg-black/10 dark:bg-white/10">Analyzing…</span>;
  }
  if (!alert.riskLevel) {
    return <span className="rounded px-2 py-1 text-xs font-medium bg-black/10 dark:bg-white/10">Unknown</span>;
  }
  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${RISK_STYLES[alert.riskLevel]}`}>
      {alert.riskLevel}
    </span>
  );
}

function relativeTime(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function GuardianConsole() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [filter, setFilter] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const query = filter === "ACTIVE" ? "?status=ACTIVE" : "";
      const response = await fetch(`/api/alerts${query}`);
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      setAlerts(data.alerts);
      setError(null);
    } catch {
      setError("Unable to load alerts.");
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  async function updateStatus(id: string, status: "RESOLVED" | "CANCELLED") {
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchAlerts();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Guardian Incident Console</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("ACTIVE")}
            className={`rounded border px-3 py-1 text-sm ${
              filter === "ACTIVE"
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/20 dark:border-white/20"
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`rounded border px-3 py-1 text-sm ${
              filter === "ALL"
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/20 dark:border-white/20"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded border border-black/20 px-3 py-1 text-sm dark:border-white/20"
          >
            Log out
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {alerts.length === 0 && !error && (
        <p className="text-sm text-black/60 dark:text-white/60">No incidents.</p>
      )}

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {riskBadge(alert)}
                <span className="text-sm font-medium">
                  {alert.triggerType === "MANUAL_SOS" ? "Manual SOS" : "Voice Distress"}
                </span>
              </div>
              <span className="text-xs text-black/60 dark:text-white/60">
                {relativeTime(alert.createdAt)}
              </span>
            </div>

            <div className="text-sm text-black/80 dark:text-white/80">
              <div>
                Device: {alert.device.type === "BAG_CLIP" ? "Bag / Clip" : "Necklace"} —{" "}
                {alert.device.label}
              </div>
              <div>
                Location:{" "}
                {alert.latitude != null && alert.longitude != null ? (
                  <a
                    className="underline"
                    href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                  </a>
                ) : (
                  alert.locationLabel ?? "Unknown"
                )}
              </div>
              {alert.recentTelemetry.length > 0 && (
                <div>
                  Heart rate: {alert.recentTelemetry.map((t) => t.heartRate).join(", ")} bpm
                </div>
              )}
            </div>

            {alert.rationale && (
              <div className="space-y-1 rounded bg-black/5 p-3 text-sm dark:bg-white/5">
                <p>{alert.rationale}</p>
                {alert.triggeringSignals && alert.triggeringSignals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {alert.triggeringSignals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                )}
                {alert.recommendedAction && (
                  <p className="font-medium">{alert.recommendedAction}</p>
                )}
                {alert.riskConfidence != null && (
                  <p className="text-xs text-black/60 dark:text-white/60">
                    Confidence: {Math.round(alert.riskConfidence * 100)}%
                  </p>
                )}
                {alert.sourceLabel && (
                  <p className="text-xs text-black/60 dark:text-white/60">
                    Source: {alert.sourceLabel}
                  </p>
                )}
              </div>
            )}

            {alert.status === "ACTIVE" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(alert.id, "RESOLVED")}
                  className="rounded bg-black px-3 py-1 text-sm font-medium text-white dark:bg-white dark:text-black"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(alert.id, "CANCELLED")}
                  className="rounded border border-black/20 px-3 py-1 text-sm font-medium dark:border-white/20"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
