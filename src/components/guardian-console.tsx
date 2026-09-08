"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  CheckCircle2,
  Cpu,
  HeartPulse,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { EdgeLight } from "@/components/edge-light";

type Telemetry = {
  id: string;
  heartRate: number;
  recordedAt: string;
};

type DeviceType = "BAG_CLIP" | "NECKLACE";
type AlertStatus = "ACTIVE" | "RESOLVED" | "CANCELLED";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type AiSource = "llm" | "fallback";

type AlertRecord = {
  id: string;
  device: { id: string; type: DeviceType; label: string };
  triggerType: "MANUAL_SOS" | "VOICE_DISTRESS";
  status: AlertStatus;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  createdAt: string;
  aiStatus: "PENDING" | "ANALYZING" | "DONE_LLM" | "DONE_FALLBACK" | "FAILED";
  riskLevel: RiskLevel | null;
  riskConfidence: number | null;
  triggeringSignals: string[] | null;
  rationale: string | null;
  recommendedAction: string | null;
  aiSource: AiSource | null;
  sourceLabel: string | null;
  recentTelemetry: Telemetry[];
};

const POLL_INTERVAL_MS = 3000;

const RISK_STYLES: Record<RiskLevel, string> = {
  CRITICAL: "bg-emergency text-emergency-foreground",
  HIGH: "bg-caution text-caution-foreground",
  MEDIUM: "bg-secondary text-secondary-foreground",
  LOW: "bg-resolved text-resolved-foreground",
};

const deviceLabel: Record<DeviceType, string> = {
  BAG_CLIP: "Bag / Clip",
  NECKLACE: "Necklace",
};

const deviceIcon: Record<DeviceType, typeof Briefcase> = {
  BAG_CLIP: Briefcase,
  NECKLACE: HeartPulse,
};

const sourceIcon: Record<AiSource, typeof Bot> = {
  llm: Bot,
  fallback: Cpu,
};

function relativeTime(iso: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
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

  const active = alerts.filter((a) => a.status === "ACTIVE");
  const inactive = alerts.filter((a) => a.status !== "ACTIVE");

  const edgeLightColor = active.length === 0
    ? null
    : active.some((a) => a.riskLevel === "CRITICAL")
      ? "var(--emergency)"
      : "var(--caution)";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 md:pt-12">
      <EdgeLight color={edgeLightColor} />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-safe">
            Step 2 · Guardian Console
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Respond as a guardian
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <FilterButton
            active={filter === "ACTIVE"}
            onClick={() => setFilter("ACTIVE")}
          >
            Active
          </FilterButton>
          <FilterButton
            active={filter === "ALL"}
            onClick={() => setFilter("ALL")}
          >
            All
          </FilterButton>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-transform hover:bg-accent active:scale-95"
          >
            Log out
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-emergency">{error}</p>}

      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Active incidents
            </h2>
            {active.length > 0 && (
              <span className="font-mono text-xs text-muted-foreground">
                {active.length} open
              </span>
            )}
          </div>

          {active.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-4">
              {active.map((alert) => (
                <IncidentCard
                  key={alert.id}
                  alert={alert}
                  onResolve={() => updateStatus(alert.id, "RESOLVED")}
                  onCancel={() => updateStatus(alert.id, "CANCELLED")}
                />
              ))}
            </div>
          )}
        </section>

        {inactive.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Resolved / cancelled
            </h2>
            <div className="flex flex-col gap-4">
              {inactive.map((alert) => (
                <IncidentCard
                  key={alert.id}
                  alert={alert}
                  onResolve={() => updateStatus(alert.id, "RESOLVED")}
                  onCancel={() => updateStatus(alert.id, "CANCELLED")}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm font-medium transition-[color,background-color,border-color,transform] active:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm">
      <span
        className="flex size-14 items-center justify-center rounded-full bg-safe/10 text-safe"
        aria-hidden="true"
      >
        <ShieldCheck className="size-7" />
      </span>
      <p className="text-base font-semibold text-foreground">
        No active incidents
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        Every wearer is checked in. Any new alert will appear here the moment
        it&apos;s raised.
      </p>
    </div>
  );
}

function IncidentCard({
  alert,
  onResolve,
  onCancel,
}: {
  alert: AlertRecord;
  onResolve: () => void;
  onCancel: () => void;
}) {
  const isActive = alert.status === "ACTIVE";
  const DeviceIcon = deviceIcon[alert.device.type];
  const analyzing = alert.aiStatus === "PENDING" || alert.aiStatus === "ANALYZING";
  const latestHeartRate = alert.recentTelemetry[0]?.heartRate;

  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm motion-safe:animate-card-in",
        isActive
          ? "border-border border-l-4 border-l-emergency"
          : alert.status === "RESOLVED"
            ? "border-resolved"
            : "border-border"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
            aria-hidden="true"
          >
            <DeviceIcon className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">
              {deviceLabel[alert.device.type]}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {alert.triggerType === "MANUAL_SOS" ? "Manual SOS" : "Voice Distress"} ·{" "}
              {relativeTime(alert.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RiskBadge riskLevel={alert.riskLevel} analyzing={analyzing} />
          <StatusBadge status={alert.status} />
        </div>
      </div>

      {alert.rationale && (
        <p className="text-sm leading-relaxed text-pretty text-foreground">
          {alert.rationale}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <LocationChip
          latitude={alert.latitude}
          longitude={alert.longitude}
          label={alert.locationLabel}
        />
        {latestHeartRate !== undefined && (
          <HeartRateChip bpm={latestHeartRate} />
        )}
      </div>

      {alert.rationale && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-col gap-2">
            {alert.triggeringSignals && alert.triggeringSignals.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {alert.triggeringSignals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            )}
            {alert.recommendedAction && (
              <p className="text-sm font-medium text-foreground">
                {alert.recommendedAction}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {alert.riskConfidence != null && (
                <span>Confidence: {Math.round(alert.riskConfidence * 100)}%</span>
              )}
              {alert.aiSource && (
                <span className="inline-flex items-center gap-1.5">
                  {(() => {
                    const SourceIcon = sourceIcon[alert.aiSource];
                    return <SourceIcon className="size-3.5" aria-hidden="true" />;
                  })()}
                  Source: {alert.sourceLabel}
                </span>
              )}
            </div>
          </div>

          {isActive && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-transform hover:bg-accent active:scale-95"
              >
                <X className="size-3.5" aria-hidden="true" />
                Cancel
              </button>
              <button
                type="button"
                onClick={onResolve}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-resolved px-3 text-sm font-medium text-resolved-foreground transition-transform hover:opacity-90 active:scale-95"
              >
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Resolve
              </button>
            </div>
          )}
        </div>
      )}

      {!alert.rationale && isActive && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            Waiting on risk assessment…
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              <X className="size-3.5" aria-hidden="true" />
              Cancel
            </button>
            <button
              type="button"
              onClick={onResolve}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-resolved px-3 text-sm font-medium text-resolved-foreground hover:opacity-90"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Resolve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskBadge({
  riskLevel,
  analyzing,
}: {
  riskLevel: RiskLevel | null;
  analyzing: boolean;
}) {
  if (analyzing) {
    return (
      <span className="inline-flex h-5 items-center rounded-full bg-muted px-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
        Analyzing…
      </span>
    );
  }

  if (!riskLevel) {
    return (
      <span className="inline-flex h-5 items-center rounded-full bg-muted px-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
        Unknown
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2.5 text-xs font-semibold tracking-wide",
        RISK_STYLES[riskLevel]
      )}
    >
      {riskLevel}
    </span>
  );
}

function StatusBadge({ status }: { status: AlertStatus }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-emergency px-2.5 text-xs font-semibold tracking-wide text-emergency-foreground">
        <AlertTriangle className="size-3" aria-hidden="true" />
        ACTIVE
      </span>
    );
  }

  if (status === "RESOLVED") {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-resolved px-2.5 text-xs font-semibold tracking-wide text-resolved-foreground">
        <CheckCircle2 className="size-3" aria-hidden="true" />
        RESOLVED
      </span>
    );
  }

  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-muted px-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
      <X className="size-3" aria-hidden="true" />
      CANCELLED
    </span>
  );
}

function LocationChip({
  latitude,
  longitude,
  label,
}: {
  latitude: number | null;
  longitude: number | null;
  label: string | null;
}) {
  if (latitude != null && longitude != null) {
    return (
      <a
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <MapPin className="size-3.5 text-location" aria-hidden="true" />
        <span className="font-mono">
          {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
        </span>
      </a>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <MapPin className="size-3.5 text-location" aria-hidden="true" />
      <span>{label ?? "Unknown"}</span>
    </div>
  );
}

function HeartRateChip({ bpm }: { bpm: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <HeartPulse className="size-3.5 text-heartbeat" aria-hidden="true" />
      <span className="font-mono text-heartbeat">{bpm} bpm</span>
    </div>
  );
}
