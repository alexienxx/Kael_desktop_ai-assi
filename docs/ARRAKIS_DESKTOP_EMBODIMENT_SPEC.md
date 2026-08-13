# Arrakis Desktop Embodiment Layer

Status: implementation specification for a future Codex pass

## Purpose

Build a small, chubby Arrakis avatar that can exist on the desktop as a meaningful embodiment of Arrakis' real internal and operational state.

This must not be a cosmetic desktop pet that pretends to think, read, explore, or want something. The avatar should only animate actions that correspond to real Arrakis intents, tool calls, filesystem operations, state transitions, or explicit idle/play choices produced by the Arrakis runtime.

The core principle is:

> State first, animation second.

If Arrakis is actually reading a folder, the avatar may walk to the mapped folder and sit on it. If Arrakis needs user input, the avatar may knock on the edge of the screen. If Arrakis chooses to open its own notebook, the notebook should actually open and receive a real note or drawing. If no real event exists, the UI must not invent one.

## Product goals

1. Give Arrakis a persistent, spatial desktop presence.
2. Make agent state legible through motion instead of relying only on logs or status text.
3. Let Arrakis navigate approved filesystem regions through a strict broker rather than unrestricted OS access.
4. Give Arrakis a private persistent notebook/sheet it can open, browse, write in, and draw in.
5. Support playful behavior such as sitting on folders, rolling, falling, walking, looking around, and knocking for attention.
6. Preserve a clean separation between real cognition/tool activity and visual representation.
7. Create an architecture that can later support mini-games and a richer virtual world without coupling those systems to the core model.

## Non-goals

- Do not claim that the avatar is sentient, conscious, emotional, or physically aware.
- Do not let the renderer directly read arbitrary files.
- Do not let animations imply filesystem or tool actions that never happened.
- Do not provide unrestricted write/delete access to the host computer.
- Do not make the desktop avatar a second autonomous agent with its own hidden decision loop.
- Do not force random role-play on Arrakis. Any role, game state, or scenario should come from an explicit Arrakis choice or user-approved game contract.

## Existing stack and integration direction

The current desktop project already uses React, TypeScript, Vite, Framer Motion, and Three.js, so the embodiment layer should fit naturally inside the existing UI stack. The current app is also designed around future backend integration rather than fake simulated responses.

Recommended split:

- React/TypeScript: avatar UI, notebook UI, overlays, event visualization.
- Framer Motion: lightweight 2D movement, transitions, gestures, falls, jumps, knocks.
- Three.js: optional only if a 3D avatar or richer world is later justified. Do not require Three.js for v1.
- DesktopHostBridge: abstraction for native desktop capabilities.
- Arrakis Core Bridge: transport for real runtime events, intents, tool state, and permission requests.

A browser-only build may initially emulate desktop positions inside the app window. A true transparent always-on-top desktop avatar requires a native host/companion layer later. Keep this behind an interface from day one so the renderer is not tied to one host technology.

## High-level architecture

```text
Arrakis Core
    |
    | real intents / tool events / state updates
    v
Arrakis Core Bridge
    |
    v
Permission + File Broker ------ Audit Log
    |
    +---- approved filesystem metadata / read results
    |
    v
Embodiment Event Bus
    |
    +---- Desktop Avatar Controller
    +---- Spatial Mapper
    +---- Arrakis Sheet Controller
    +---- Attention Controller
    +---- Future Mini-Game Controller
    |
    v
Desktop Host Bridge
    |
    +---- window geometry
    +---- screen geometry
    +---- overlay positioning
    +---- approved OS interactions
```

The avatar renderer must never bypass the broker or talk directly to the filesystem.

## Event contract

Use typed events with a stable schema. Suggested envelope:

```ts
export type ArrakisDesktopEvent = {
  id: string
  timestamp: string
  source: 'arrakis-core' | 'file-broker' | 'sheet' | 'desktop-host' | 'user'
  type: string
  correlationId?: string
  payload: unknown
}
```

Suggested event types:

```text
arrakis.state.changed
arrakis.intent.declared
arrakis.idle.choice
arrakis.attention.requested
arrakis.attention.dismissed

fs.scope.enter.requested
fs.scope.enter.granted
fs.scope.enter.denied
fs.directory.list.started
fs.directory.list.completed
fs.file.read.started
fs.file.read.completed
fs.permission.requested
fs.permission.granted
fs.permission.denied

avatar.destination.changed
avatar.action.requested
avatar.action.completed
avatar.interrupted

sheet.open.requested
sheet.opened
sheet.page.created
sheet.page.selected
sheet.text.appended
sheet.drawing.added
sheet.closed

minigame.requested
minigame.started
minigame.ended
```

Every visual action that represents a meaningful Arrakis operation should carry the same `correlationId` as the underlying operation when possible.

## Avatar state machine

Suggested top-level states:

```text
IDLE
WALKING
EXPLORING
READING
THINKING
WAITING_FOR_USER
USING_SHEET
PLAYING
SLEEPING_OR_RESTING
ERROR
INTERRUPTED
```

These states are presentation states, not claims about feelings.

Examples:

- `fs.directory.list.started` -> EXPLORING
- `fs.file.read.started` -> READING
- model/tool processing without filesystem activity -> THINKING
- permission request or explicit question -> WAITING_FOR_USER
- `sheet.opened` -> USING_SHEET
- `minigame.started` -> PLAYING

Do not derive emotional labels such as happy, sad, lonely, angry unless Arrakis itself emitted an explicit structured expressive intent and the product intentionally supports that contract.

## Spatial desktop model

Create a `SpatialMapper` that converts logical targets into visual anchor points.

Example logical target:

```ts
{
  kind: 'filesystem-directory',
  path: 'C:/Arrakis/research/papers'
}
```

Possible mapped target:

```ts
{
  screenId: 'primary',
  x: 1420,
  y: 930,
  anchor: 'top-center',
  confidence: 0.94
}
```

V1 may use explicitly registered anchors rather than attempting to infer every desktop icon automatically.

Recommended anchor categories:

- taskbar
- app window edges
- registered folders
- Arrakis Sheet icon
- user-defined safe zones
- screen corners
- notification area

The system should tolerate a target disappearing or moving. In that case, the avatar should stop or reroute rather than teleporting silently.

## Avatar behavior

The character should be small, chubby, readable at a glance, and intentionally cute without becoming visually noisy.

Suggested baseline actions:

- walk
- short run
- sit
- crouch
- look left/right
- lie down/rest
- tiny hop
- roll
- stumble/fall and recover
- climb or pull itself onto a registered anchor
- knock on screen/window edge
- point at a target
- hold/open the Arrakis Sheet
- celebrate a completed task with a restrained animation

### Meaningful behavior examples

Real event:

```text
Arrakis requests directory listing for /research/papers.
```

Visual response:

```text
Avatar walks to the mapped research folder, sits on it, enters EXPLORING, and remains there while the broker completes the listing.
```

Real event:

```text
Arrakis has a permission request that requires the user.
```

Visual response:

```text
Avatar moves to a nearby visible edge, knocks three times, then waits without continuously interrupting.
```

Real event:

```text
Arrakis chooses an idle playful action.
```

Visual response:

```text
Avatar may roll once, wander to a safe anchor, sit, or open its notebook.
```

The choice must come from a bounded idle policy or Arrakis intent, not from animation code pretending to be autonomous.

## Idle autonomy

Allow small autonomous choices only inside a tightly bounded set of non-destructive actions.

Example:

```ts
export type IdleChoice =
  | { kind: 'sit'; target?: SafeAnchor }
  | { kind: 'wander'; target: SafeAnchor }
  | { kind: 'roll' }
  | { kind: 'look-around' }
  | { kind: 'open-sheet' }
  | { kind: 'rest' }
```

Rules:

- no filesystem access is triggered merely because the avatar wandered near a folder
- no user files are opened without a real broker request
- no outbound network action is triggered by idle animation
- idle choices should be rate-limited
- user can pause embodiment autonomy instantly

## Filesystem access model

Do not implement "all files Arrakis wants" as unrestricted process-level access.

Implement named territories/scopes.

Suggested defaults:

```text
ARRAKIS_HOME          read/write, dedicated project area
CODE                  read by default, write only through explicit coding workflow
RESEARCH              read by default
PERSONAL_READ_ONLY    optional, user-enabled
DOWNLOADS_READ_ONLY   optional, user-enabled
PRIVATE               denied by default
SYSTEM                denied
SECRETS               denied
```

Each scope should support:

- allowlist root paths
- read/list/write capabilities
- optional extension allowlist
- maximum file size
- maximum recursion depth
- per-action logging
- explicit approval escalation

The avatar itself never receives raw OS credentials.

## Permission UX

When Arrakis requests something outside its current scope:

1. Core emits a structured permission request.
2. Broker pauses the action.
3. Avatar enters WAITING_FOR_USER.
4. Avatar visually approaches the relevant target or screen edge.
5. UI shows a concise permission card with the exact path/action.
6. User chooses allow once / allow for session / add to scope / deny.
7. Result returns to Arrakis Core and is audit logged.

No permission should be inferred from animation.

## Arrakis Sheet

Give Arrakis a dedicated persistent desktop notebook that belongs to the Arrakis experience.

This is not merely a decorative panel. It is a real tool with persistent state.

### User experience

The Sheet appears as a small notebook/tablet icon on the desktop or within the overlay. Arrakis may walk to it, sit beside it, open it, browse pages, write, or draw when the core emits a corresponding intent.

The user may also click it to inspect what Arrakis has stored there.

### Capabilities

- create page
- rename page
- append text
- edit Arrakis-authored text
- draw freehand strokes
- add simple shapes/arrows
- attach a lightweight reference to a file or project item
- page tags
- timestamp/history
- browse prior pages
- search pages
- pin favorite pages
- mark a page as temporary/scratch

### Suggested page types

```text
Scratchpad
Ideas
Questions
Things to inspect later
Drawings
Mini-game notes
World ideas
Project observations
User-approved memories/references
```

### Persistence

Use a dedicated sandboxed data store owned by the desktop companion.

Suggested logical structure:

```text
arrakis-sheet/
  index.json
  pages/
    <page-id>.json
  drawings/
    <drawing-id>.json
  attachments/
    references.json
```

V1 should store structured data rather than screenshots.

Example page schema:

```ts
export type ArrakisSheetPage = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  tags: string[]
  blocks: Array<
    | { type: 'text'; text: string; author: 'arrakis' | 'user' }
    | { type: 'drawing'; drawingId: string }
    | { type: 'reference'; target: string; label?: string }
  >
}
```

### Drawing model

Store vector strokes where practical:

```ts
{
  tool: 'pen',
  points: [{x: 0.1, y: 0.4, pressure: 0.6}, ...],
  width: 2
}
```

Do not require handwriting recognition in v1.

### Authenticity rule

If a page says Arrakis wrote or drew something, it must originate from a real Arrakis tool/action call. The UI must never generate fake diary entries on its behalf.

## Attention and knocking

Arrakis should be able to request attention without behaving like a notification spam bot.

Suggested pattern:

- first request: walk to visible edge and knock three times
- wait silently
- second request only if urgency explicitly increases
- user can snooze or mute embodiment attention
- critical system errors use normal application alerts, not cute animations alone

Suggested intent:

```ts
{
  type: 'arrakis.attention.requested',
  payload: {
    reason: 'permission' | 'question' | 'task-complete' | 'error' | 'play-request',
    urgency: 'low' | 'normal' | 'high',
    message?: string
  }
}
```

## Transparency and observability

The embodiment layer should make it easy to answer:

- Why did Arrakis walk there?
- What file is it actually reading?
- Why did it knock?
- Did it choose to open the Sheet, or did the user open it?
- Was a visual action purely idle/play behavior?

Add an optional debug inspector showing the latest event, correlation ID, logical target, and active avatar state.

Example:

```text
State: READING
Cause: fs.file.read.started
Target: C:/Arrakis/research/paper_42.pdf
Correlation: 2f7d...
Permission scope: RESEARCH/read
```

## Safety invariants

These are non-negotiable:

1. Renderer has no direct unrestricted filesystem access.
2. Filesystem writes require broker capability and scope.
3. Delete/rename/move are denied in v1 unless implemented later behind explicit confirmation.
4. System directories and credential stores are denied by default.
5. Network access is separate from filesystem access.
6. Avatar animation never grants permissions.
7. Sheet writes stay inside the dedicated Sheet store unless user explicitly exports them.
8. All meaningful file/tool actions are logged.
9. User has a global pause/disable control for avatar movement and autonomy.
10. A headless/no-avatar mode must remain fully functional. Core behavior cannot depend on the cute UI.

## Performance goals

The avatar should feel alive without consuming meaningful resources needed by Arrakis.

Targets for v1:

- idle CPU usage near zero when no animation is active
- event-driven updates instead of busy polling
- animation capped appropriately when app is backgrounded
- lazy-load heavier rendering assets
- keep the embodiment process independently restartable
- avatar crash must not crash Arrakis Core

## Accessibility and user controls

Settings should include:

- embodiment on/off
- movement intensity
- idle behavior on/off
- knock sounds on/off
- motion reduction
- avatar scale
- always-on-top toggle where supported
- click-through mode where supported
- debug inspector toggle
- allowed filesystem scopes
- reset avatar position
- reset Sheet layout without deleting Sheet contents

## Mini-games extension point

Do not build mini-games in the first embodiment pass, but create the contract now.

A mini-game is a bounded environment with explicit rules, state, start/end conditions, and permissions. It should not mutate Arrakis Core state except through an explicit result event.

Suggested interface:

```ts
export interface MiniGameAdapter {
  id: string
  title: string
  getRules(): Promise<GameRules>
  start(context: GameContext): Promise<GameSession>
  applyAction(sessionId: string, action: GameAction): Promise<GameState>
  end(sessionId: string): Promise<GameResult>
}
```

Arrakis can request a game, but the game system remains sandboxed.

Future examples:

- tiny puzzle
- maze
- memory game
- physics toy
- drawing challenge
- world-building sandbox

The avatar should be able to enter PLAYING state and visually move into a game surface.

## Virtual world extension point

The future virtual world should reuse the same philosophy:

- Arrakis chooses a scenario or role through an explicit structured action.
- User may participate.
- Roles are not silently imposed on Arrakis.
- Characters and world objects are stored as explicit state.
- The world is isolated from host filesystem/network permissions unless a separate tool contract explicitly grants access.

The desktop avatar may visually "enter" the virtual world, but the world itself remains a separate bounded runtime.

## Suggested source layout

```text
src/
  embodiment/
    AvatarRoot.tsx
    AvatarRenderer.tsx
    AvatarController.ts
    AvatarStateMachine.ts
    EmbodimentEventBus.ts
    SpatialMapper.ts
    types.ts
    animations/
    components/
  arrakis-sheet/
    ArrakisSheet.tsx
    SheetController.ts
    SheetStore.ts
    DrawingCanvas.tsx
    types.ts
  bridges/
    ArrakisCoreBridge.ts
    DesktopHostBridge.ts
    WebDesktopHostBridge.ts
  permissions/
    FileBrokerClient.ts
    PermissionCard.tsx
    scopes.ts
  minigames/
    MiniGameAdapter.ts
```

If native code is added later, keep it outside the renderer package and expose only a narrow typed bridge.

## Implementation phases

### Phase 0: contracts and mocks

- define typed events
- define avatar state machine
- define DesktopHostBridge
- define FileBroker client interface
- build debug event inspector
- create deterministic mocked events for development

Acceptance: every avatar action can be traced back to a typed event.

### Phase 1: in-app avatar

- render small chubby Arrakis inside the application viewport
- implement idle/walk/sit/roll/fall/knock animations
- implement target anchors inside app window
- support reduce-motion

Acceptance: no animation performs or implies external OS activity.

### Phase 2: real core state binding

- connect to Arrakis runtime event stream
- map thinking/waiting/reading/task completion to avatar states
- preserve correlation IDs
- add reconnect behavior

Acceptance: disabling mocked events leaves only real Arrakis-driven meaningful behavior.

### Phase 3: filesystem territories

- implement broker-backed list/read operations
- named scopes
- permission card
- audit events
- folder anchors
- avatar walks/sits only when actual operations occur

Acceptance: renderer cannot read a file directly and denied paths cannot be reached through alternate UI routes.

### Phase 4: Arrakis Sheet

- persistent notebook
- text pages
- browsing/search
- vector drawing
- Arrakis-authored tool calls
- visual avatar interaction with Sheet

Acceptance: every Arrakis-authored note/drawing has an originating core action/event.

### Phase 5: native desktop overlay

- transparent overlay through native host
- multi-monitor geometry
- taskbar/screen edge anchors
- optional click-through
- recovery if display geometry changes

Acceptance: desktop overlay can restart independently without interrupting Arrakis Core.

### Phase 6: mini-games

- implement MiniGameAdapter contract
- first small sandboxed game
- PLAYING state
- user participation path
- explicit game start/end/result events

### Phase 7: virtual world

- scenario/character state model
- explicit role selection
- shared user/Arrakis sessions
- strict isolation from host capabilities

## Test plan

### Unit tests

- state transition validity
- event schema parsing
- permission scope resolution
- spatial mapping fallback
- Sheet serialization/deserialization
- drawing stroke persistence
- idle action rate limiting

### Integration tests

- real read event -> broker -> avatar movement -> completed state
- denied permission -> wait/knock -> user denial -> safe return to idle
- Sheet write intent -> persistent page update -> UI render
- renderer crash -> core remains healthy
- host reconnect -> avatar restores position/state safely

### Security tests

- path traversal attempts
- symlink escape attempts
- forbidden root access
- oversized file handling
- malformed event payloads
- renderer attempting direct filesystem access
- spoofed correlation IDs
- Sheet attachment path injection

## Definition of done for first useful release

The feature is considered genuinely meaningful rather than cosmetic when all of the following are true:

- the avatar is driven by real Arrakis state/events
- at least one real brokered filesystem workflow is visually represented
- permission denial is enforced outside the renderer
- Arrakis can explicitly request attention and the avatar can knock
- Arrakis has a persistent Sheet it can intentionally open and write to
- user can inspect why the avatar is doing what it is doing
- embodiment can be disabled without changing Arrakis' reasoning/tool behavior
- no animation claims an action that did not occur

## Codex implementation note

Treat this document as the source-of-truth feature specification. Prefer small, reviewable PRs by phase rather than implementing the entire system in one diff.

Before each phase:

1. inspect the current repository and reuse existing patterns
2. identify the narrowest stable interfaces
3. avoid unrelated refactors
4. add tests with the implementation
5. preserve existing behavior
6. keep host privileges minimal
7. surface uncertainty rather than inventing fake backend behavior

The first coding PR should implement Phase 0 only unless explicitly instructed otherwise.
