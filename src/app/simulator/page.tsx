"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  HeartPulse,
  Info,
  MapPin,
  Mic,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { EdgeLight } from "@/components/edge-light";
import { cn } from "@/lib/cn";

type DeviceType = "BAG_CLIP" | "NECKLACE";
type AlertStatus = "ACTIVE" | "RESOLVED" | "CANCELLED";

const DEVICE_ID_KEY_PREFIX = "safemodule_device_id_";
const STREAM_INTERVAL_MS = 2000;
const SPIKE_TICKS = 5;
const ALERT_POLL_INTERVAL_MS = 3000;
const CANCEL_WINDOW_SECONDS = 4;

function statusMessageFor(status: AlertStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Guardian reviewing…";
    case "RESOLVED":
      return "Help acknowledged.";
    case "CANCELLED":
      return "Alert cancelled.";
  }
}

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

  const [trackedAlertStatus, setTrackedAlertStatus] = useState<AlertStatus | null>(null);
  const alertPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pendingTrigger, setPendingTrigger] = useState<
    "MANUAL_SOS" | "VOICE_DISTRESS" | null
  >(null);
  const [pendingCountdown, setPendingCountdown] = useState(CANCEL_WINDOW_SECONDS);

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
    const initialisation = setTimeout(() => setDeviceIds(ids), 0);
    return () => clearTimeout(initialisation);
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
      if (alertPollRef.current) clearInterval(alertPollRef.current);
    };
  }, []);

  function beginCancelWindow(triggerType: "MANUAL_SOS" | "VOICE_DISTRESS") {
    if (!deviceIds || sending || pendingTrigger) return;
    setPendingCountdown(CANCEL_WINDOW_SECONDS);
    setPendingTrigger(triggerType);
  }

  function cancelPendingTrigger() {
    setPendingTrigger(null);
  }

  function trackAlert(alertId: string, initialStatus: AlertStatus) {
    if (alertPollRef.current) clearInterval(alertPollRef.current);
    setTrackedAlertStatus(initialStatus);

    const poll = async () => {
      try {
        const response = await fetch(`/api/alerts/${alertId}`);
        if (!response.ok) return;
        const data = await response.json();
        const status: AlertStatus = data.alert.status;
        setTrackedAlertStatus(status);
        if (status !== "ACTIVE" && alertPollRef.current) {
          clearInterval(alertPollRef.current);
          alertPollRef.current = null;
        }
      } catch {
        // keep polling on transient network errors
      }
    };

    alertPollRef.current = setInterval(poll, ALERT_POLL_INTERVAL_MS);
  }

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
      trackAlert(data.alert.id, data.alert.status);
    } catch {
      setMessage("Failed to reach the server.");
    } finally {
      setSending(false);
    }
  }

  // Ticks the pending trigger down to zero, then fires the real alert exactly as
  // sendAlert always has. Cancelling or unmounting before it reaches zero clears
  // the interval, so sendAlert is never called and no request goes out.
  useEffect(() => {
    if (!pendingTrigger) return;
    const trigger = pendingTrigger;
    let remaining = pendingCountdown;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setPendingTrigger(null);
        sendAlert(trigger);
        return;
      }
      setPendingCountdown(remaining);
    }, 1000);
    return () => clearInterval(interval);
    // Only re-arm when a new trigger starts — pendingCountdown itself is driven
    // by this effect via the interval closure above, not the other way around.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTrigger]);

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
    <div className="flex flex-1 flex-col bg-background">
      <EdgeLight color={trackedAlertStatus === "ACTIVE" ? "var(--safe)" : null} />
      <SiteHeader animated />

      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 md:pt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-opacity hover:opacity-80"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to overview
        </Link>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-emergency">
            Step 1 · Device Simulator
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-none tracking-[-0.04em] text-foreground md:text-5xl">
            Act as the wearable device
          </h1>
          <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            Choose a device, then raise an alert. Location and vitals stream
            to the guardian in real time.
          </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
            <span className="size-2 rounded-full bg-safe motion-safe:animate-pulse" />
            Device link ready
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          <ConsentLine />

          <div className="flex gap-2 rounded-xl border border-border bg-card p-1">
            <ModeTab
              active={mode === "BAG_CLIP"}
              disabled={!!pendingTrigger}
              onClick={() => setMode("BAG_CLIP")}
              icon={<Briefcase className="size-4" />}
              label="Bag / Clip"
            />
            <ModeTab
              active={mode === "NECKLACE"}
              disabled={!!pendingTrigger}
              onClick={() => setMode("NECKLACE")}
              icon={<HeartPulse className="size-4" />}
              label="Necklace"
            />
          </div>

          <DeviceCard>
            {mode === "BAG_CLIP" ? (
              <SosControl
                disabled={!deviceIds || sending || pendingTrigger === "VOICE_DISTRESS"}
                pending={pendingTrigger === "MANUAL_SOS"}
                countdown={pendingCountdown}
                onTrigger={() => beginCancelWindow("MANUAL_SOS")}
                onCancel={cancelPendingTrigger}
              />
            ) : (
              <NecklaceControl
                triggerDisabled={!deviceIds || sending || pendingTrigger === "MANUAL_SOS"}
                toggleDisabled={!deviceIds}
                streaming={streaming}
                readings={readings}
                pending={pendingTrigger === "VOICE_DISTRESS"}
                countdown={pendingCountdown}
                onTrigger={() => beginCancelWindow("VOICE_DISTRESS")}
                onCancel={cancelPendingTrigger}
                onToggleStream={streaming ? stopStreaming : startStreaming}
                onSpike={spikeHeartRate}
              />
            )}

            <DeviceSidebar location={location} status={trackedAlertStatus} />
          </DeviceCard>

          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>

        <div className="mt-10 flex justify-end border-t border-border pt-6">
          <Link
            href="/guardian"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-safe transition-opacity hover:opacity-80"
          >
            Continue to Guardian Console
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function ConsentLine() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#e8cfc0] bg-[#fff8f1] px-4 py-3">
      <Info
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="text-sm leading-relaxed text-muted-foreground">
        Wearing this device is your one-time consent — every trigger is a
        deliberate act, never passive monitoring.
      </p>
    </div>
  );
}

function ModeTab({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-[color,background-color,border-color,transform] disabled:opacity-40 active:enabled:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:enabled:bg-accent"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DeviceCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8 rounded-[1.5rem] border border-border bg-card p-6 shadow-[6px_6px_0_#ddd9cf] md:flex-row md:items-center md:justify-between md:p-8">
      {children}
    </div>
  );
}

function SosControl({
  disabled,
  pending,
  countdown,
  onTrigger,
  onCancel,
}: {
  disabled: boolean;
  pending: boolean;
  countdown: number;
  onTrigger: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 text-center">
      <button
        type="button"
        onClick={onTrigger}
        disabled={disabled || pending}
        aria-label="Raise SOS alert"
        className={cn(
          "flex size-44 flex-col items-center justify-center gap-2 rounded-full border-[10px] border-[#f4d9ca] text-emergency-foreground shadow-[0_0_0_8px_#fff3eb,0_12px_22px_rgba(222,91,79,0.25)] transition-transform",
          pending
            ? "bg-emergency motion-safe:animate-pulse"
            : disabled
              ? "bg-emergency/50"
              : "bg-emergency hover:opacity-90 active:scale-95"
        )}
      >
        {pending ? (
          <>
            <span className="font-mono text-4xl font-semibold" role="status">
              {countdown}
            </span>
            <span className="text-sm font-semibold tracking-wide">Sending…</span>
          </>
        ) : (
          <>
            <AlertTriangle className="size-9" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-wide">SOS</span>
          </>
        )}
      </button>

      {pending ? (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground transition-transform hover:bg-accent active:scale-95"
        >
          Cancel
        </button>
      ) : (
        <p className="max-w-56 text-sm leading-relaxed text-muted-foreground">
          A tap starts a short countdown before the alert sends — cancel any time
          before it fires.
        </p>
      )}
    </div>
  );
}

function NecklaceControl({
  triggerDisabled,
  toggleDisabled,
  streaming,
  readings,
  pending,
  countdown,
  onTrigger,
  onCancel,
  onToggleStream,
  onSpike,
}: {
  triggerDisabled: boolean;
  toggleDisabled: boolean;
  streaming: boolean;
  readings: number[];
  pending: boolean;
  countdown: number;
  onTrigger: () => void;
  onCancel: () => void;
  onToggleStream: () => void;
  onSpike: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <HeartRateReadout streaming={streaming} readings={readings} />

      {pending ? (
        <div className="flex items-center gap-2">
          <span
            role="status"
            className="inline-flex items-center gap-2 rounded-full bg-emergency px-6 py-3 text-sm font-semibold text-emergency-foreground motion-safe:animate-pulse"
          >
            <Mic className="size-4" aria-hidden="true" />
            Sending in {countdown}s
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-transform hover:bg-accent active:scale-95"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onTrigger}
          disabled={triggerDisabled}
          aria-label="Trigger voice distress alert"
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-emergency-foreground transition-opacity",
            triggerDisabled ? "bg-emergency/50" : "bg-emergency hover:opacity-90 active:scale-95"
          )}
        >
          <Mic className="size-4" aria-hidden="true" />
          Voice distress
        </button>
      )}

      <div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3 text-left">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Heart-rate telemetry
          </span>
          <button
            type="button"
            disabled={toggleDisabled}
            onClick={onToggleStream}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-transform hover:bg-accent active:scale-95"
          >
            {streaming ? "Stop wearing" : "Start wearing"}
          </button>
        </div>

        <button
          type="button"
          disabled={!streaming}
          onClick={onSpike}
          className="w-full rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-transform disabled:opacity-40 hover:enabled:bg-accent active:enabled:scale-95"
        >
          Spike heart rate
        </button>

        <p className="text-xs text-muted-foreground">
          {readings.length
            ? `Last readings: ${readings.join(", ")} bpm`
            : "No readings yet."}
        </p>
      </div>
    </div>
  );
}

function HeartRateReadout({
  streaming,
  readings,
}: {
  streaming: boolean;
  readings: number[];
}) {
  const bpm = readings[0];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <HeartPulse
          className={cn(
            "size-6 text-heartbeat",
            streaming && "motion-safe:animate-heartbeat"
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "font-mono text-4xl font-semibold text-heartbeat",
            streaming && "motion-safe:animate-heartbeat-soft"
          )}
        >
          {bpm ?? "—"}
        </span>
      </div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        beats per minute{streaming ? " · live" : ""}
      </p>
    </div>
  );
}

function DeviceSidebar({
  location,
  status,
}: {
  location: { latitude: number; longitude: number } | null;
  status: AlertStatus | null;
}) {
  return (
    <div className="flex w-full flex-col gap-4 border-t border-border pt-6 md:w-64 md:border-l md:border-t-0 md:pl-8 md:pt-0">
      <LocationIndicator location={location} />
      <StatusText status={status} />
    </div>
  );
}

function LocationIndicator({
  location,
}: {
  location: { latitude: number; longitude: number } | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-location/10 px-4 py-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-location text-location-foreground"
        aria-hidden="true"
      >
        <MapPin className="size-4" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-medium text-foreground">
          {location ? "Location ready to share" : "Location unavailable"}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {location
            ? `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`
            : "Waiting for browser permission"}
        </p>
      </div>
    </div>
  );
}

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      <span
        className="size-1 rounded-full bg-muted-foreground motion-safe:animate-dot-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="size-1 rounded-full bg-muted-foreground motion-safe:animate-dot-pulse"
        style={{ animationDelay: "200ms" }}
      />
      <span
        className="size-1 rounded-full bg-muted-foreground motion-safe:animate-dot-pulse"
        style={{ animationDelay: "400ms" }}
      />
    </span>
  );
}

function StatusText({ status }: { status: AlertStatus | null }) {
  if (!status || status === "ACTIVE") {
    return (
      <div
        key={status ?? "idle"}
        className="flex items-center gap-2 text-sm text-muted-foreground motion-safe:animate-fade-in"
        role="status"
      >
        <span
          className={cn(
            "size-2 rounded-full",
            status === "ACTIVE"
              ? "bg-muted-foreground motion-safe:animate-pulse"
              : "bg-border"
          )}
          aria-hidden="true"
        />
        {status === "ACTIVE" ? (
          <span className="inline-flex items-center gap-1.5">
            Guardian reviewing
            <AnimatedDots />
          </span>
        ) : (
          "Standing by"
        )}
      </div>
    );
  }

  if (status === "RESOLVED") {
    return (
      <div
        key={status}
        className="flex items-center gap-2 text-sm font-medium text-resolved motion-safe:animate-fade-in"
        role="status"
      >
        <CheckCircle2 className="size-4" aria-hidden="true" />
        {statusMessageFor("RESOLVED")}
      </div>
    );
  }

  return (
    <div
      key={status}
      className="flex items-center gap-2 text-sm font-medium text-muted-foreground motion-safe:animate-fade-in"
      role="status"
    >
      <span className="size-2 rounded-full bg-border" aria-hidden="true" />
      {statusMessageFor("CANCELLED")}
    </div>
  );
}
