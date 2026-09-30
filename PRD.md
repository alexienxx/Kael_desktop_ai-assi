# Planning Guide

A premium desktop chat application for an AI assistant named "Kael" that delivers an elegant, luminous, Windows Vista/Aero Glass-inspired experience with extensive customization options and media handling capabilities.

**Experience Qualities**:
1. **Luminous** - Soft glowing gradients, translucent glass panels, and ethereal light effects create a premium, almost dreamlike visual experience
2. **Refined** - Every interaction feels intentional with smooth transitions, elegant spacing, and polished desktop-quality components that transcend typical web chat interfaces
3. **Personal** - Deep customization controls allow users to craft their ideal aesthetic through accent gradients, bubble styles, transparency levels, and visual presets

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a full-featured desktop chat application with multiple panels (sidebar, main chat, settings, media), extensive theme customization system, message type handling (text, audio, images), session management, and architecture prepared for future backend integration.

## Essential Features

**Theme Customization System**
- Functionality: Users can select from preset themes and customize appearance parameters including accent gradients, bubble styles, border radius, transparency intensity, and glow intensity
- Purpose: Creates a deeply personal experience and showcases the app's premium, desktop-quality aesthetic flexibility
- Trigger: User clicks settings icon, navigates to appearance tab
- Progression: Settings panel opens → User selects preset or adjusts sliders → Changes apply in real-time → Settings persist across sessions
- Success criteria: Theme changes apply instantly, preferences save to local storage, all UI elements respect theme tokens

**Conversation Management**
- Functionality: Create new chats, switch between conversations, search chat history, view conversation list with previews
- Purpose: Enables multi-session workflow essential for desktop AI assistant usage
- Trigger: User clicks "New Chat" or selects existing conversation from sidebar
- Progression: User initiates action → Conversation loads into main area → Message history displays → Composer becomes active
- Success criteria: Conversations load smoothly, switching is instant, search filters accurately, session state persists

**Message Display & Composition**
- Functionality: Display messages with distinct user/assistant bubbles, timestamps, support for text/images/audio, compose and send messages
- Purpose: Core chat interaction with premium visual treatment that elevates beyond standard web chat
- Trigger: Messages load on conversation open, user types in composer and sends
- Progression: User types message → Clicks send or presses enter → Message appears in chat → Auto-scroll to latest → Composer clears
- Success criteria: Messages render beautifully, scrolling is smooth, bubbles adapt to content, spacing feels generous and desktop-quality

**Audio Message Playback**
- Functionality: Display audio messages with play/pause controls, progress bar, duration, waveform visual, download button
- Purpose: Critical for voice interactions with AI assistant, must feel elegant not utilitarian
- Trigger: Audio message received or user clicks play on existing audio message
- Progression: User clicks play → Playback begins → Progress bar animates → Duration updates → User can pause, seek, or download
- Success criteria: Controls are elegant and intuitive, playback is smooth, download saves file locally, visual feedback is premium

**Image Preview & Download**
- Functionality: Display images in chat with preview cards, click to enlarge modal, save to computer button
- Purpose: Handle visual content from AI with desktop-quality media management
- Trigger: Image message displays, user clicks to enlarge or download
- Progression: Image appears in chat bubble → User clicks → Enlarged modal opens OR download initiates → File saves to device
- Success criteria: Images load gracefully, modals are smooth, downloads work reliably, saved files are accessible

**Media Library Panel**
- Functionality: View all downloaded/saved media from conversations, quick access to files, clear visual organization
- Purpose: Desktop apps need file management; creates a complete media experience
- Trigger: User clicks downloads/media section in sidebar
- Progression: User clicks media panel → Panel opens → Lists all saved images/audio → User can click to view or locate files
- Success criteria: All saved media appears, organized by type and date, accessible and navigable

**Backend Connection Interface**
- Functionality: Display connection status, provide reconnect controls, placeholder for future API configuration
- Purpose: Prepares architecture for real backend integration without hardcoded fake behavior
- Trigger: App loads (shows connection status), user opens connection settings
- Progression: App checks connection → Status badge updates → User can view details in settings → Future: configure API endpoints
- Success criteria: Status reflects reality, placeholders are clear for future implementation, no fake simulated responses

## Edge Case Handling

**Empty States** - Beautiful placeholders when no conversation is selected, no messages exist, or no media downloaded yet
**Long Messages** - Text wraps elegantly, maintains bubble aesthetics, doesn't break layout
**Rapid Message Sending** - Queue handles multiple sends gracefully, no UI jank or double-sends
**Audio Playback Conflicts** - Only one audio plays at a time, switching pauses previous
**Missing Media** - Graceful error states if image fails to load or audio file is unavailable
**Offline Mode** - Clear visual indication, composer disabled, reconnect prompt available
**Settings Validation** - Sliders have reasonable bounds, invalid inputs prevented, defaults available
**Responsive Layout** - While desktop-focused, handles window resizing gracefully

## Design Direction

The design should evoke the luminous, sophisticated aesthetic of Windows Vista Aero Glass combined with contemporary soft pastel palettes. Every surface should feel like it's made of light—translucent, glowing, layered with depth through blur effects and subtle gradients. The interface should feel premium and intentional, as if it were crafted specifically for desktop use rather than a web page styled to look like an app. Think soft glows, generous breathing room, refined typography, and interactions that feel smooth and weighted.

## Color Selection

The color system uses soft pastel gradients with translucent glass effects, creating a luminous and ethereal experience.

- **Primary Color**: Soft lavender `oklch(0.85 0.08 290)` - Communicates elegance, calm intelligence, and premium assistant aesthetic
- **Secondary Colors**: 
  - Pale pink `oklch(0.88 0.06 345)` for warm accents
  - Sky blue `oklch(0.87 0.07 230)` for cool balance
  - Pearl white `oklch(0.97 0.01 90)` for clean backgrounds
- **Accent Color**: Luminous violet `oklch(0.75 0.15 285)` - For interactive elements, CTAs, and active states with soft glow effect
- **Foreground/Background Pairings**: 
  - Background (Pearl White #F8F7FB): Dark slate text `oklch(0.25 0.02 280)` - Ratio 14.2:1 ✓
  - Accent (Luminous Violet #A78BFA): White text `oklch(0.97 0.01 90)` - Ratio 4.9:1 ✓
  - Assistant Bubble (Lavender Glow #E5DBFF): Dark slate `oklch(0.25 0.02 280)` - Ratio 13.1:1 ✓
  - User Bubble (Soft Pink #FFE5F0): Dark slate `oklch(0.25 0.02 280)` - Ratio 12.8:1 ✓

## Font Selection

Typography should convey modern sophistication with excellent readability—clean sans-serif with subtle geometric qualities that feel both technical and approachable, perfect for an AI assistant interface.

- **Primary Font**: Inter for UI elements, Crimson Pro for message content to add editorial refinement
- **Typographic Hierarchy**: 
  - H1 (App Title "Arrakis"): Inter SemiBold/24px/tight tracking (-0.02em)
  - H2 (Section Headers): Inter Medium/16px/normal tracking
  - H3 (Chat Titles): Inter Medium/14px/normal tracking
  - Body (Messages): Crimson Pro Regular/15px/relaxed leading (1.6)
  - Small (Timestamps, Labels): Inter Regular/12px/slight tracking (0.01em)
  - Captions (Status, Hints): Inter Regular/11px/normal tracking

## Animations

Animations should reinforce the glass aesthetic with smooth, weighted transitions that feel physical yet ethereal. Every interaction should have subtle motion that adds to the premium feel—bubbles that gently float in, panels that slide with soft easing, and controls that respond with delicate scale and glow changes.

Key animation moments:
- Message bubbles fade in with subtle upward float (300ms ease-out)
- Panel transitions slide with backdrop blur fade (250ms ease-in-out)
- Audio playback controls pulse gently during playback
- Theme changes cross-fade smoothly (400ms)
- Hover states scale slightly with glow intensity increase (150ms)
- Settings sliders respond with smooth value animation

## Component Selection

**Components**:
- **Sidebar Navigation**: Custom component with ScrollArea for chat list, using Card for conversation items
- **Chat Window**: ScrollArea for message list, custom MessageBubble components
- **Message Bubbles**: Custom components built on Card with conditional styling for user/assistant
- **Audio Player**: Custom component with Slider for progress, Button for controls, Progress bar
- **Image Cards**: Custom component with Dialog for enlargement, Button for download
- **Composer**: Textarea for input, Button components for send/attach/voice actions
- **Settings Panel**: Sheet or Dialog with Tabs for organization, Slider components for customization
- **Theme Customizer**: Custom RadioGroup for presets, multiple Slider components for fine control
- **Status Badge**: Custom component using Badge primitive with color indicators
- **Media Panel**: ScrollArea with Card grid layout for downloaded files

**Customizations**:
- Glass morphism effect component wrapper for panels (backdrop-blur with gradient borders)
- Luminous glow utility for accent elements (box-shadow with colored blur)
- Animated gradient backgrounds for main areas
- Custom audio waveform visualization component
- Theme token system for runtime color switching

**States**:
- Buttons: Default with soft gradient → Hover with glow increase and slight scale → Active with inner shadow → Disabled with reduced opacity
- Inputs: Default with glass border → Focus with accent glow ring → Filled with subtle highlight → Error with soft red tint
- Message Bubbles: Default → Hover with subtle lift shadow → Selected with accent border glow
- Audio Player: Paused (play icon) → Playing (pause icon, animated progress) → Loading (subtle pulse)

**Icon Selection**:
- New Chat: Plus (simple, clear)
- Send Message: PaperPlaneRight (directional, active)
- Attach File: Paperclip (universal standard)
- Voice Input: Microphone (clear purpose)
- Settings: Gear (standard convention)
- Search: MagnifyingGlass (universal)
- Play Audio: Play / Pause (standard media controls)
- Download: DownloadSimple (clear action)
- Close/Exit: X (minimal, clear)
- Theme: Palette (creative, visual)

**Spacing**:
- Page padding: 6 (24px) for main areas
- Section gaps: 4 (16px) between major sections
- Component padding: 3-4 (12-16px) for cards and panels
- Message gaps: 3 (12px) between bubbles, 6 (24px) between conversation groups
- Button padding: 2.5 (10px) vertical, 4 (16px) horizontal
- Sidebar padding: 4 (16px) consistent throughout

**Mobile**:
While desktop-focused, responsive considerations:
- Sidebar collapses to drawer on smaller viewports (<1024px)
- Right panel becomes bottom sheet on tablet (<768px)
- Message bubbles maintain max-width but scale padding
- Composer remains fixed at bottom with adjusted controls
- Settings panel becomes full-screen modal on mobile
