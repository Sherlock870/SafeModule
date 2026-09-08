# Project Spec

## Overview

**SafeModule** — Problem Statement #21: an AI-based real-time women safety
alert system. Core idea: the interface itself can be a barrier — a person in
danger shouldn't have to unlock a phone, find an app, and press a button. The
physical wearable is represented in this hackathon build by a software
device simulator; the rest of the system (backend, alert pipeline, guardian
response console) is fully real.

## Problem Statement

A person in danger needs a way to raise an alert that requires the fewest
possible deliberate actions, and needs that alert to reach a responder
immediately — without waiting on, or depending on, any AI/LLM call.

## Goals

- A single deliberate action (button press or voice trigger) creates an
  alert instantly, with zero dependency on AI availability.
- Continuous heart-rate telemetry is captured as a supporting risk signal,
  never as an automatic trigger on its own.
- Every alert is asynchronously enriched with a risk assessment (level,
  confidence, signals, rationale, recommended action) without blocking
  alert creation.
- A guardian can see and act on active incidents in near-real-time via
  polling.

## Non-Goals

Explicitly out of scope for this build: real emergency-service dispatch,
real SMS/WhatsApp/Twilio integration, physical Bluetooth hardware, complex
auth/RBAC beyond single-user login, multi-tenant architecture, and any
map SDK (location is shown as plain lat/lng with a link to Google Maps).

## Target Users

- **The wearer** — interacts only with the Device Simulator, no account
  required (consent is wearing the device; every trigger is a deliberate
  act, not passive monitoring).
- **The guardian** — an authenticated responder who monitors the Guardian
  Incident Console and resolves or cancels incidents.

## Features

- Device Simulator (`/simulator`, public): Bag/Clip mode (single SOS
  button) and Necklace mode (voice-distress button + simulated/spikeable
  heart-rate stream), plus live polling of the alert it just created
  ("Guardian reviewing…" → "Help acknowledged.").
- Telemetry ingestion (`POST /api/telemetry`), fully decoupled from alerts.
- Alert creation (`POST /api/alerts`), synchronous and AI-independent.
- Async risk-assessment enrichment: a real call to the Gemini API
  (`gemini-3.5-flash-lite`, 3s timeout) when `GEMINI_API_KEY` is set, with
  a deterministic rule-based fallback that always completes if the key is
  missing, the call fails, times out, or returns malformed output.
- Guardian Incident Console (`/guardian`, authenticated): polls active
  alerts, shows risk level, telemetry, rationale, triggering signals,
  recommended action, and its enrichment source; resolve/cancel actions;
  log out.

## Success Metrics

For the demo: an alert appears on the Guardian Console within one polling
cycle (~3s) of being triggered on the simulator, is visibly enriched with a
risk assessment shortly after, and can be resolved/cancelled with the
change reflected back on the simulator within one polling cycle.

## Timeline

Built in a single hackathon session: scaffold → auth → data model → alert
pipeline → simulator/console UI → transparency/consent hardening → testing.
