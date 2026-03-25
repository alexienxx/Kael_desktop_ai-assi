# kael_desktop_assi — CHANGELOG

## 2025-07-11 — Kael Cognitive Observatory

### Added
- **Observatory types** (`src/lib/observatory-types.ts`): Full type definitions for all 10 Observatory sections (CoreOverview, WeightsHealth, IdentityDrift, DecisionPreferences, EmotionalState, MemoryStats, PersonaRouting, ModulesOverview, RecentEvents, RawDebugData) plus shared envelope types (ObservatoryMeta, ObservatoryResponse, Freshness, RiskLevel, Trend).

- **Observatory service** (`src/services/observatoryService.ts`): Data-composition layer that fetches from 5 `/debug/*` endpoints in parallel and composes all 10 Observatory section payloads. Uses existing `transportFetchJson` from backendTransport.ts. Hybrid strategy: ready to switch to `/observatory/*` endpoints when backend implements them.

- **useObservatoryData hook** (`src/hooks/useObservatoryData.ts`): Polling hook with 5-second interval, loading/error/live/unconfigured states, stale-data preservation on errors, config-reactive via backendConfigStore subscription.

- **Observatory shared primitives** (`src/panels/observatory/shared.tsx`): Desktop-adapted UI primitives — MetaBar, FreshnessBadge, RiskBadge, TrendArrow, Sparkline (recharts AreaChart), ValueBar (Progress-based), SubsystemStatusDot, SectionLoading, SectionError, SectionPending, SectionUnconfigured, WarningBanner, GlassCard.

- **10 Observatory section components** (`src/panels/observatory/`):
  - OverviewSection — Model, uptime, heartbeat, tick, modules, flags, subsystem grid
  - WeightsSection — Weight health with category filters, sparklines, impact tooltips
  - IdentitySection — Drift score, coherence, traits, emerging/declining themes
  - DecisionsSection — Action distribution, decision paths, top factors
  - EmotionalSection — Emotional axes with risk badges, sparklines, stability gauge
  - MemorySection — DB status, counts, saturation bar, category breakdown
  - PersonaSection — Active persona, blend mode/factors, manifest routing
  - ModulesSection — Module list with status icons (active/degraded/inactive/wired/broken)
  - EventsSection — Event tape with severity indicators, bus counters
  - DebugSection — Raw JSON viewer with collapsible sections, copy-to-clipboard

- **ObservatoryPage** (`src/pages/ObservatoryPage.tsx`): Full-screen deep-dive page with 10 horizontally scrollable tabs, risk indicator dots on tabs, shared polling via useObservatoryData, close/refresh buttons.

- **Barrel export** (`src/panels/observatory/index.ts`): Clean re-exports for all section components.

### Modified
- **ControlCenter** (`src/components/ControlCenter.tsx`):
  - Replaced old 3-tab layout (Overview/Identity&Drift/System) with Observatory-powered quick view (Overview + Emotional + Modules).
  - Removed all MOCK_* data usage — now shows real backend data via Observatory service.
  - Removed dependency on controlCenterService.ts fetch functions.
  - Added `onExpandObservatory` prop and "Expand" button to open full Observatory page.
  - Uses shared `useObservatoryData` hook for consistent polling.

- **App.tsx** (`src/App.tsx`):
  - Added `observatoryOpen` state.
  - Imported `AnimatePresence` from framer-motion and `ObservatoryPage`.
  - Wired ControlCenter → Observatory expand flow.
  - Renders ObservatoryPage as a full-screen overlay with enter/exit animation.

### Impact
- **Zero changes** to: backendService.ts, chatSyncService.ts, conversationManager.ts, ChatWindow.tsx, Composer.tsx, Sidebar.tsx, SettingsPanel.tsx, backendTransport.ts, backendConfigStore.ts.
- **No new backend endpoints required** — all data composed from existing `/debug/*` endpoints.
- **No new npm dependencies** — uses existing recharts, framer-motion, @phosphor-icons/react, shadcn/ui.
- **Backward compatible** — old panels in `src/panels/` remain untouched (CognitiveFlowPanel, IdentityPanel, DriftPanel, MemoryPanel, SystemPanel, AutonomyPanel). controlCenterService.ts remains on disk for potential future use.
