# 魚樂無窮

## Current manual-session and speed rules — 15 October 2026

Visual thesis: relaxed side-view swimming with individual, gently varying cruise speeds.

Content plan: remove the visitor download button, session-length input and duration setting. Sessions have no fixed endpoint; the teacher uses the existing pause/resume, restart and end controls. The end window contains visitors, field guide and restart.

Interaction thesis: define a calm speed range for each species, give individuals different preferred speeds, then ease their speed toward new nearby targets every few seconds while keeping cruising within the species range. Turning and panic retain their distinct slowing/acceleration. Noise protects the newest resident of the lowest rarity present. Capacity replacement still follows the existing abundance and age rule.

These rules supersede conflicting timing and survivor details below.

## Current swimming and starter rules — 15 October 2026

Visual thesis: full-size side-view fish, quiet horizontal patrols and soft speed changes at reversals.

Content plan: one randomly selected common fish is present at the start of each session, restart and class change. It counts as a visit and discovery. Keep the same immersive controls and end-of-session guide.

Interaction thesis: remove head-on imagery, squash and intermediate poses. Ease speed down, flip the side sprite once near zero velocity, then ease speed back up. Fish patrol laterally, reverse before walls, occasionally make an early turn and gently drift in depth. Panic remains fast and erratic with a lateral bias. Noise always protects the oldest resident of the lowest rarity present, so at least one stays.

These rules supersede conflicting starter and turning details below.

## Current refinement — 15 October 2026

Visual thesis: restore the original pixel-art coral, rock and sand composition, with consistent creature pixel density and restrained surface-only noise warnings.

Content plan: keep the immersive aquarium and its two corner controls; settings contains class, language, microphone, session, motion and field-guide controls. Remove the history and backup sections. Retain the end-of-session visitors and field-guide flow.

Interaction thesis: rasterise complete creature poses (including depth scaling, tilt and turns) onto one shared two-unit pixel grid; larger animals have more pixels, not enlarged pixels. Sway the original painted coral/kelp locally. Noise changes only the wave lines clipped to the upper 85 logical pixels, while retaining collective panic and one-second departures.

The earlier direction below is retained as project history; this refinement supersedes conflicting visual and settings details.

## V2 direction — 15 October 2026

Visual thesis: an uninterrupted, full-window pixel ocean with softly moving reef flora, water and sunlight; only two discreet icon buttons appear at the upper right.

Content plan: the aquarium fills the browser; all class, language, sensitivity, calibration, duration, capacity, collection and backup controls live in settings; pause opens Resume / Restart / End; the end-of-session window shows visitors and a field-guide button. No title, banners, current-volume meter, arrival countdown or session clock appears over the aquarium.

Interaction thesis: calm, varied two-dimensional swimming with independent wandering; explicit side-to-front-to-opposite-side turning animation in both directions; immediate collective panic and strong water distortion above the noise limit, first departures at one continuous loud second and more losses every second thereafter. Every animation freezes while paused.

- Default language is Traditional Chinese, with English available in settings.
- Built-in classes: P.1–P.6 × 信 / 望 / 愛 / 智; English house labels F / H / L / W. Preserve old saved data when migrating.
- 50 actively swimming marine species; remove slow bottom-dwelling animals from new arrivals. Historical records of removed species remain readable.
- Start automatically after microphone permission. Use the class’s stored calibration, or a conservative default limit; guided 12-second calibration is available in settings without a separate Start action.
- Panic begins immediately above the limit, with faster, erratic movement for every resident. Departures start after 1 second and recur every 1 second; loudness controls the number and rarity controls vulnerability.
- Keep the 10-second settling period and retained arrival credit. Keep the 45–60-second quiet arrival cadence, 30-minute default duration and default resident cap of 20.
- Pause freezes creature positions, turning, body motion, plants, water, bubbles and lighting. Resume continues; Restart saves the partial session and starts fresh; End shows all visitors and access to 圖鑑.
- Changing class in settings saves the previous partial session and prepares a fresh session for the selected class.

The original V1 notes below describe the previous prototype and are superseded by this V2 section.

Visual thesis: a rich, gently animated pixel-art reef, with luminous turquoise water, deep blue shadows, warm sand and a restrained cream-and-coral teacher interface.

Content plan: the aquarium is the main workspace; a slim navigation bar selects the class, field guide and session history; a bottom dock holds microphone feedback, session time and controls; dialogs handle calibration, class management, settings and backups.

Interaction thesis: independently swimming and deforming creature sprites; drifting pixel sunbeams, seabed caustics, bubbles and swaying plants; sound-driven surface waves that gradually settle during recovery.

## Agreed classroom rules

- Gentle reading aloud; silence also earns quiet progress. The teacher checks reading.
- Browser app, one computer, local class profiles, export/import backups, switchable Traditional Chinese and English.
- Each session starts empty; default duration 30 minutes. Class discoveries persist.
- Calibrate 12 seconds of appropriate classroom reading, then allow a manual threshold adjustment. Calibration is a relative microphone reference, not calibrated physical dB SPL.
- Arrivals every 45–60 seconds of acceptable, settled reading. Earned progress is retained across warnings and teacher pauses.
- A 5-second visible wave warning precedes any departures. Continued noise causes small spaced groups to leave. Louder sound increases the group size; rarer creatures are more vulnerable.
- Returning below the limit immediately stops departures. The water needs 10 continuous seconds below the limit to settle before arrival progress resumes. Further excessive sound restarts recovery.
- Teacher pause freezes the session clock and all game progress, and suspends microphone analysis. The teacher can end a session early.
- Default capacity 20. To admit a newcomer, eligible residents must have rarity at or below the newcomer. Choose lowest rarity, then most numerous species in that rarity, then oldest individual. A lower-rarity newcomer swims past if all residents are rarer; it still counts as a visit and discovery.
- Duplicate species can coexist. The report lists every species that visited, visit counts and discoveries, including departed and passing creatures.
- The field guide shows silhouettes for undiscovered species. Demo progress is never saved into a class collection.

## Initial balance defaults

- 24 species across Common, Uncommon, Rare, Epic and Legendary tiers.
- Tier probabilities: 54%, 27%, 13%, 5%, 1%; uniform species choice within each tier.
- A departure group every 7 seconds after the warning; 1, 2 or 3 creatures per group depending on how far volume exceeds the threshold, further capped to one quarter of the current residents (minimum one).
- Weighted departure selection favours rarer residents; capacity replacement follows the deterministic rule above.
- Class collections, calibration and settings are local. No audio recordings or audio uploads.
- A clearly labelled accelerated demonstration uses simulated volume and temporary visitors.

## Implementation

Native browser modules, Canvas 2D and Web Audio; no runtime framework or external asset dependencies. A small Node static server provides localhost microphone access. Use generated local pixel-art assets and native canvas effects. A service worker caches the app after its first successful load.

## Verification

Deterministic engine tests cover warning/recovery timing, pause, arrival credit, capacity order, rarity protection, repeated visitors, noise loss, collection reporting and session completion. Browser checks cover the demo, real microphone calibration with synthetic audio, class separation, persistence, backup validation, bilingual views, navigation and responsive layout. Actual classroom threshold and school-computer performance need classroom testing.
