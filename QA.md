# Verification · V2.7 · 15 October 2026

## Automated tests

**50 native Node tests pass** with `npm test`; no package installation is needed.

Nine new token tests cover count and rarity sensitivity, duplicate residents, diminishing returns, preserved fractional earnings, pause/end freezing, reduced income after departures, passing visitors, frame-size independence, invalid elapsed time, restart reset, the 150-token hard cap in long sessions, average rewards across 400 seeded 30-minute sessions, class isolation, backward-compatible stored reports and invalid stored amounts.

### Token balance · V2.7

The shipped formula is `3.6 × (1 − exp(−P / 5))` tokens per active minute, where `P` sums current resident rarity weights `[1, 1.4, 2, 3, 4]`. Each 0.1-second integration step accumulates fractional rewards, the counter/report floors the total, and the session clamps it to 150. Only residents contribute; no tokens are deducted when fish leave. Pause/end and microphone interruptions stop the existing engine clock and therefore earnings. The session has no automatic time limit.

Ran 1,000 independent 1,800-second sessions per profile using the actual engine, capacity 20, threshold 65, quiet volume 20 and the LCG seed sequence 1–1,000 (`seed = (1664525 × seed + 1013904223) >>> 0`). All reported values below are integer tokens. Arrivals, rarity, recovery and capacity replacement remain enabled.

| Sound profile | Mean | Median | Range |
| --- | ---: | ---: | ---: |
| Quiet throughout | 96.422 | 96 | 93–101 |
| Volume 70 for 1 second every 4 minutes | 94.044 | 94 | 90–99 |
| Volume 75 for 3 seconds every 5 minutes | 71.692 | 72 | 65–79 |
| Volume 75 for 3 seconds every 2 minutes | 36.269 | 36 | 30–44 |

The 70–100 target applies to the average of typical 30-minute quiet/occasional-noise sessions, not every possible noise pattern or duration. The hard 150 cap holds for any duration. A separate maximum-capacity test starts with forty legendary residents, runs for two hours, reaches exactly 150 and remains running until manually ended. A 90,001-second single-survivor session also stores exactly 150.

Two new renderer tests check substantial up/down tail travel for humpback, orca and dolphin in both swimming directions, stable heads, static field-guide poses, and bounded panic motion. Atlas mapping coverage also checks fifty unique valid sprite slots across the new layouts.

Two new motion regressions simulate a whale with full body margins at desktop and narrow widths, in calm and panic, and check smooth entries from both directions. The full body stays within its safe bounds while still traversing the available space; arrivals become residents only after their body is inside, without a position jump.

Five crop regression tests cover complete fins crossing cell boundaries, neighboring fragments inside overlapping bounding rectangles, faint haze connecting two bodies, detached dust, diagonal thin fins, low-opacity outline pixels, transparent padding, non-divisible atlas dimensions, and explicit failure for incomplete input.

New and revised coverage:

- A session remains running after two simulated hours and ends exactly once when explicitly requested. There is no duration setting or automatic end condition.
- Stored sessions can exceed one day. A 90,001-second session and a visitor arriving after 24 hours survive a storage round trip; obsolete saved `minutes` settings are ignored.
- Noise leaves the newest resident within the lowest rarity present, including when a newer, higher-rarity fish exists. A lone fish cannot flee.
- All fifty species have a defined calm speed range. Ten individuals of each species are simulated for ninety seconds: preferences differ, every fish’s speed varies, changes remain gradual, and cruising stays inside its species range. Turning slows below cruise speed; panic uses faster movement.
- Existing horizontal patrol, wall reversal, smooth side changes, collective panic, initial common visitor, arrival/recovery timing, capacity, rarity, pause and class-data tests pass.

## Browser checks

Verified in isolated Chromium profiles with synthetic audio; no classroom audio was used.

### Production integration and tokens · V2.7

- The real source aquarium loads the updated large and legendary atlases, including horizontal whale/orca tail motion and the flat hammerhead. Its shared pixel size remains two logical units. The startup still shows six years, then four houses, before any audio connection or discovery; the token counter is hidden there and starts at zero after class selection.
- Accelerated the running source session through 1,800 active seconds using synthetic quiet: it earned 97 tokens with twenty residents. Teacher pause left the fractional amount, displayed integer and complete canvas byte-identical. Manual ending displayed 97 in the visitor summary and stored it only for the chosen class.
- Restart reset the counter to zero while preserving the previous 97-token report. The next session reached exactly 150 after about 45 active minutes and continued running. Opening settings froze it; switching class reset the displayed amount to zero and saved the old class's 150-token report. English labels update with the language setting.
- At 320 × 568, all four report summary columns fit inside the dialog without horizontal overflow. The upper-right token pill, pause and settings controls fit the viewport. The source service worker activated `morning-reef-10` and cached all twenty-one shell resources.
- Rebuilt the standalone after the final UI text change and opened it directly under Offline network emulation at 320 × 568. Synthetic quiet increased the live counter from zero to two; pause froze both counter and full canvas, ending showed and stored two tokens, and restart displayed zero. There were zero HTTP(S) resource requests and no source or standalone console errors. English source labels read “Session tokens: 0”.

### Two-stage classes, clearer art and tail motion · V2.6

- Startup shows six year numbers and zero class buttons. Choosing each year produces exactly its four 信／望／愛／智 classes; switching years updates those four buttons. Cycling through all six years leaves storage and audio untouched. English uses “Choose a year group”, then the four F/H/L/W choices.
- Selecting P.6 智 starts the source aquarium with one common discovery only for that class. Other classes match their pre-selection snapshots. The offline standalone was checked at 320 × 568: year numbers use two rows, then all four class choices fit, with no audio or discoveries before the final class click. P.2 望 starts automatically after selection.
- Visually checked all fifty active crops after hard-edge alpha treatment, including goatfish barbels, bannerfish filament and all new large sprites. Complete new source bounds stay away from image edges; component masks keep neighboring animals out even where bounding rectangles overlap.
- Checked 1,000 poses using both directions, calm/panic, maximum depth scale and five animation times. No clipping or empty poses. All fifty species passed exact 2 × 2 output-block equality; all fifty source crops have only transparent or opaque alpha. The drawing buffer grew to 308 × 308 samples to accommodate large tail motion.
- Actual rendered tail centroids travel about 23.2–23.4 logical pixels for humpback, 18.7–18.9 for orca and 13.9–14.0 for dolphin across opposite stroke phases, in both directions. Every corresponding head-region byte remains identical.
- The new atlases contain four and three complete creatures. Together with existing sheets, the standalone creates 81 isolated crops and uses 57 (50 active plus seven historical). Initial offline loading makes zero HTTP(S) requests.
- In the rebuilt offline file, accelerated synthetic quiet admitted an orca naturally. Teacher pause froze the full canvas, manual ending listed both the common starter and orca, and the guide rendered fifty icons. The source service worker activated `morning-reef-9` and cached all twenty-one shell resources.
- The refreshed comparison preview animates and then freezes byte-for-byte when paused. `size-comparison-v3.png` records the new crisp sprites and flat hammerhead at 1920 × 1080; the older screenshot remains available for comparison. Source, preview and offline-file consoles reported zero errors.

Earlier verification sections below record the previous revisions and their measurements.

### Class selection and comparison preview · V2.5

- Both source and standalone open to twenty-four class buttons before making a session or connecting a microphone. A fresh offline profile had zero audio contexts, discoveries and reports. Esc did not dismiss the picker; aquarium controls remain hidden until a class is chosen.
- Choosing P.3 智 in the source created exactly one common fish and unlocked it only for that class. All other class data matched the pre-selection snapshot, and no report was written before the session ended. Choosing P.6 愛 in the fresh offline standalone likewise started automatically with just that class's first discovery and zero external HTTP(S) requests.
- An English preference survives reload: the first screen reads “Choose your class”, with all twenty-four P.1–6 F/H/L/W labels. The last used class receives focus. Traditional Chinese shows the corresponding 信／望／愛／智 labels.
- At 390 × 844, the picker and all twenty-four choices fit entirely onscreen, with 53-pixel-tall tap targets. The new service worker cached all nineteen shell resources successfully.
- The separate comparison page uses the production `ReefScene`, native aspect ratios and current world sizes. It contains five common fish, two sharks and two whales, initially frozen for comparison, with a play/pause control. It has no microphone or classroom-store code. The native 1920 × 1080 screenshot is `size-comparison.png`.
- Compared canvas snapshots before playback, during playback and after pausing: the initial scene is still, playback changes the frame, and pausing makes the full canvas stable again. The nine residents use the same two-unit pixel pitch and classroom storage stays untouched. Final source and preview consoles reported zero errors.

### Size and pixel audit · V2.4

- All fifty aquarium sizes increased, with ordinary fish around 20% larger. Large epic swimmers received larger increases, and legendary animals grew about 80–90%. Size remains species-based: the small epic mandarinfish stays smaller than large common fish. Humpback whale is largest, followed by whale shark and orca.
- Visually compared a representative aquarium containing common fish, a mandarinfish, hammerhead, manta ray, whale shark and humpback whale. Animals retain their source aspect ratio and complete anatomy.
- Checked 1,000 poses at maximum depth scale: fifty species, both directions, calm and panic, five animation times. Every pose has a clear margin in the dynamically growing drawing buffer, which reached 266 × 266 samples. All fifty species also passed a pixel-by-pixel check that each output pixel occupies the same 2 × 2 logical-unit block, including the largest whales.
- Ran 360,000 body-bound checks with real sprite dimensions across 960 × 540 and 600 × 900 worlds, calm and panic. Every resident remained inside the full-body margins. A large departing whale remained visible past the old 25% offscreen cutoff and was removed only after its tail cleared the screen. Passing visitors entered and exited correctly in both directions.
- The actual source app rendered the enlarged humpback using a 206 × 206 sample buffer while retaining the two-unit pixel pitch. Teacher pause left the entire canvas byte-identical after waiting. The offline standalone was accelerated with deterministic QA-only randomness until a legendary orca arrived naturally: its drawing buffer grew beyond the old 160-sample limit, and the orca appeared in the manually ended visitor report. All fifty field-guide icons had clear canvas edges. Both app consoles had zero errors.

### Complete crop audit · V2.3.1

- Visually inspected all fifty active creatures facing right and left, at large size on a transparency checkerboard. Whole fins, tails, barbels and tentacles are present; no neighboring fragments remain. The source illustrations are unchanged.
- Independently labeled the entire native atlases at alpha ≥ 8/255: atlas A has 25 complete bodies, B has 25, and the historical atlas has 24. All 57 used crops (50 active plus seven historical) exactly match their complete component bounds and foreground pixel counts. All 1,137,825 body pixels are retained, no foreign foreground pixels enter any crop, and all crops have four transparent pixels of padding.
- Twenty-two active creatures cross a nominal cell boundary. Particularly visible restorations include the bannerfish dorsal filament, dolphin tail, sunfish dorsal fin and humpback pectoral fin. These can no longer appear in neighboring sprites such as the goatfish, mandarinfish and orca.
- Checked 1,000 rendered poses: every active species, both directions, calm and panic, at five animation times and maximum depth scale. Every pose has visible pixels and a clear margin inside the renderer's shared canvas; none touches its edge.
- Whole-scene artwork loading and extraction completed in 84 ms in the audit browser; this is a local measurement, not a school-computer benchmark.
- Reloaded the actual source app and rebuilt standalone with synthetic audio. Each creates all 74 independent atlas crops (including unused historical cells), totaling 1,539,462 foreground pixels, and starts running with its initial fish. Both real field guides contain fifty nonempty icons with clear canvas edges. Removed history, backup and duration settings remain absent. No application errors were reported; synthetic audio needed the browser's normal user-gesture resume.

### Session behavior retained from V2.3

- Chinese and English settings contain no session-length input or duration text. The capacity control remains, with a capacity-only next-session note. Stored settings no longer contain `minutes`.
- The actual app was accelerated through 10,542 simulated seconds and remained running with twenty residents. Acceleration was applied only inside the QA browser, without changing shipped source.
- Before sustained noise, the expected survivor was calculated from the live residents: lowest rarity, then highest arrival order. After noise, exactly that individual remained. In this run it was visitor 203, a tuna; later arrivals of higher rarity did not override the rule.
- Teacher pause froze the actual canvas pixels. Manual ending produced a report after 10,683 simulated seconds, with one resident and forty-two visited species.
- The report contains only close, field guide and restart controls. No visitor-download button or download action remains.
- Browser simulation of three clownfish (allowed calm range 8–14 logical pixels/second) showed different preferences and temporal ranges: 9.38–12.25, 9.12–11.78 and 9.26–10.60. These are animation speeds, not biological measurements.
- Final source and offline-file console checks contain no application errors.

Previous immersive layout, fifty-species guide, initial common fish, shared pixel density, full pause freeze and surface-only waves remain in place. Capacity replacement retains its previous age/abundance ordering; noise protection uses the new newest-within-lowest rule.

## Standalone and cache

`npm run build` produces **Morning Reef.html**, approximately **12.4 MB**, with six embedded images, JavaScript and CSS.

The rebuilt file was opened directly through `file:///` under DevTools Offline network emulation. It made zero external HTTP(S) resource requests. Settings had no duration input; a manually ended session showed only close, guide and restart. Stored settings contained capacity, threshold, calibration margin and motion preference.

The source service worker uses `morning-reef-11`, with twenty-one shell resources including both new atlases. This branding update changes the application title and manifest name to 魚樂無窮; the rebuilt standalone includes the new name, year-then-class selection before microphone connection, the updated assets and tail motion, and session tokens. The separate comparison page is a localhost preview, outside the classroom session and the standalone bundle.

## Classroom trial

Actual microphone placement, classroom threshold, school browser permissions, projector readability and school-computer performance still require a classroom trial. The threshold is relative microphone volume, not physical dB SPL. Collections use browser-local storage; file-origin and school-policy behaviour can differ.
