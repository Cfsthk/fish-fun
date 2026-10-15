# Artwork · 15 October 2026

## Current scene revision

The original `reef.png` coral, rock and sand design is restored. The renderer gently bends selected coral/kelp areas of that original painting; the newer oversized flora clusters are no longer layered into the scene. Noise only changes wave lines at the top, without full-image distortion or tinting.

All fifty creatures now render onto the same **two-logical-unit pixel grid** before compositing. Body motion, depth/size and rotation happen before this rasterisation; final enlargement uses nearest-neighbour sampling. This gives larger animals more pixels while maintaining the same displayed pixel pitch as small animals. The same path renders guide and visitor icons.

### Clear large sprites and cetacean tails · V2.6

Pixel pitch alone did not fix the softer source shading of the enlarged animals. Seven large species were redrawn with the built-in **imagegen** tool, using the small-fish atlas as the pixel-art style reference. Four large swimmers now occupy a 2 × 2 atlas; the three legendary animals each have a full-width row in a separate portrait atlas. Their complete source widths are about 575–626 pixels and 1,053 pixels respectively, rather than roughly 230–272 pixels in the old 5 × 5 sheet. Source art uses distinct flat shade bands and stronger outlines. The hammerhead has a low, flattened cephalofoil in side profile; the humpback and orca have flattened horizontal flukes.

After whole-component extraction, sprite alpha is snapped to 0 or 255 at 128/255 to remove antialiased fringes. The segmentation threshold remains 8/255 so thin connected anatomy is found before edge treatment. All fifty active species were visually rechecked for complete fins and barbels. Animation strips are approximately four logical units wide, independent of the source atlas resolution, and final sampling still uses the shared two-unit grid.

Whales, orcas and dolphins now bend the rear 48% of the body vertically, with motion increasing towards the flukes and a stable head. Calm tail amplitude reaches 6.5% of rendered body size; panic increases frequency and amplitude. Drawing buffers and tank margins include the additional tail travel. Static icons and teacher pause remain still. These changes use native Canvas animation; no video or runtime image-generation service is required.

### Larger, proportionate swimmers · V2.4

All fifty aquarium sizes were increased. Ordinary fish grow about 20%; medium animals about 25–40%. Larger epic animals grow about 35–70%, and the three legendary animals about 80–90%. Humpback whale (340 logical units), whale shark (312) and orca (276) are largest, followed by hammerhead (228), manta ray (210), sailfish (208), reef shark (202) and dolphin (184). A clownfish is 74 and the small epic mandarinfish is 78. These are compressed display proportions, not a biological length scale.

The shared pose buffer grows to fit large or tilted animals while preserving the same two-unit pixel pitch. Each sprite retains its native aspect ratio. Steering and world bounds use the full sprite dimensions plus room for tilt and moving fins. A departing whale is removed only after its whole body has cleared its exit edge. Field-guide and report thumbnails retain their readable, fitted presentation. This sizing revision preceded the V2.6 source-art replacements above.

### Complete creature extraction · V2.3.1

The generated atlases do not strictly obey their requested cell margins: 22 active creatures extend beyond a nominal grid edge. Fixed rectangular cell crops cut off their anatomy and included fragments from neighbors. `sprite-crops.mjs` now labels eight-connected foreground components across each **whole atlas**. The grid identifies each creature by its foreground centroid; it never limits that creature's crop. Every output canvas contains only its own component, with four transparent pixels of padding, so overlapping bounding rectangles cannot contaminate each other.

Alpha values below 8/255 are excluded as near-transparent haze; allowing that haze to connect components incorrectly joins neighboring animals. At the V2.3.1 extraction stage, thin diagonal fins and all foreground pixels at or above that threshold remained intact. Both original side atlases yield exactly 25 complete bodies, and the historical atlas yields 24. All fifty active sprites were inspected facing both ways, including the restored bannerfish dorsal filament, dolphin tail, sunfish dorsal fin and humpback pectoral fin. Seven historical icons use the same extraction. That revision did not regenerate source illustrations; V2.6 adds the two new atlases and hard-alpha edge treatment described above.

No new raster generation was needed for V2.3–V2.4; V2.6 replaces seven large sprites as described above. Direction changes use side poses throughout; a creature slows down, switches directly to its opposite side, then accelerates. It keeps the same full body size throughout. Artwork was created with Codex’s built-in **imagegen** tool; prompt specifications are retained below.

## Active files

| File | Layout | Purpose |
| --- | --- | --- |
| `reef.png` | 1672 × 941 | Original coral, kelp, rock and sand painting, restored as requested. |
| `swimmers-a-v2.png` | 1254 × 1254, 5 × 5 | Side-view sprites for species 1–25. |
| `swimmers-b-v2.png` | 1254 × 1254, 5 × 5 | Remaining medium and large species; seven entries are superseded by the V3 sheets. |
| `swimmers-large-v3.png` | 1254 × 1254, 2 × 2 | Dolphin, manta ray, blacktip reef shark, flat-headed hammerhead. |
| `swimmers-legendary-v3.png` | 1086 × 1448, 1 × 3 | Whale shark, humpback whale, orca. |
| `creatures-clean.png` | Legacy 4 × 6 atlas | Historical icons for removed V1 creatures. |

`reef-base-v2.png`, `flora-v2.png` and both `turns-*-v2.png` head-on atlases remain as previous design assets, but are not loaded, cached or bundled by the current app. `art.mjs` defines the active asset mapping and `species.mjs` maps each creature to its atlas cell.

## Prompt specifications

The exact V3 built-in imagegen prompts and final workspace paths are recorded in [V3-PROMPTS.md](V3-PROMPTS.md).

### Side atlas A

Create a production sprite atlas for a premium 16-bit pixel-art marine aquarium for primary-school children. Genuine transparent PNG, precisely 25 complete isolated creatures in a strict, evenly spaced 5-column × 5-row grid. Centre one creature in each square cell with generous margins. No cell borders, letters, labels, backgrounds, haze, shadows, plants or objects. Do not cross cell boundaries. Consistent crisp pixel clusters, recognisable natural anatomy, dark teal outlines and rich marine colours. All fish are side view facing right, with their head on the right and tail on the left. Comparable source size; runtime code will scale different species. Exact row order:

1. Clownfish; blue tang; yellow tang; copperband butterflyfish; damselfish.
2. Anchovy; sardine; green chromis; anthias; fusilier.
3. Six-line wrasse; goatfish; mullet; sergeant major; pufferfish.
4. Emperor angelfish (marine blue/yellow stripes, not a freshwater triangular angelfish); longfin bannerfish; powder-blue surgeonfish; parrotfish; rabbitfish.
5. Squirrelfish; soldierfish; sweetlips; filefish; triggerfish.

### Side atlas B

Use the same production sprite-atlas specification and style as atlas A: precisely 25 complete isolated marine creatures, genuine transparency, strict 5 × 5 grid, generous empty margins, one animal per cell, no labels or extra objects. Side view facing right. Keep all fins, tails and tentacles within their own cell. Exact row order:

1. Yellow boxfish; flying fish; garfish; sea turtle; blue-spotted stingray.
2. Lionfish; cuttlefish; octopus; squid; barracuda.
3. Bluefin tuna; mahi-mahi; batfish; moray eel; trumpetfish.
4. Mandarinfish; dolphin; manta ray; blacktip reef shark; hammerhead shark.
5. Ocean sunfish; sailfish; whale shark; humpback whale; orca.

### Turning atlases A and B

Edit the corresponding side-view atlas into a matching set of precisely 25 **head-on / front-view** marine creatures. Preserve the exact 5 × 5 cell order, species identity, colour palette, crisp pixel-art style and transparent background. Each creature looks toward the viewer so the game can animate side → front → opposite side for a natural turn in either direction. Front fish bodies should appear narrow with both eyes/fins visible when anatomically appropriate; rays, sharks, turtles and whales have recognisable head-on silhouettes. Include the whole body, fins and tentacles within the cell with generous transparent margins. No text, grid lines, backgrounds, shadows or extra objects.

These two images were generated as edits referencing `swimmers-a-v2.png` and `swimmers-b-v2.png`, respectively. Their generation prompts are retained for provenance, but these head-on images are no longer loaded or used. Direction changes now use the mirrored side sprite at full size, with eased braking and acceleration.

### Bare reef background

Create a beautiful detailed 16-bit pixel-art underwater aquarium background, wide landscape 16:9 composition. Luminous turquoise surface water grades into rich blue, with a warm sandy seabed across the lower quarter and subtle distant rock silhouettes. Open clear water leaves generous swimming space. Crisp square pixel clusters with a consistent game-art style. **No fish, animals, coral, kelp, seaweed or foreground plants**, since those must move independently. No text, interface, frame, tank glass, room, treasure or shipwrecks. No hard dramatic baked-in sunbeams; moving lighting and caustics will be rendered in code. Calm, bright, inviting marine environment.

### Coral and seaweed atlas

Create one genuine transparent PNG atlas with exactly six isolated pixel-art marine plant/coral clusters in a strict 3-column × 2-row grid. One complete cluster per cell, consistent detailed 16-bit reef-game style, crisp edges, generous transparent margins; no text, grid borders, water, shadows, fish or seabed. Each cluster grows upward from its own small base so the renderer can anchor and sway it. Exact cell order:

1. Rose-pink branching soft coral.
2. Lavender-purple branching sea fan / soft coral.
3. Tall flowing green kelp.
4. Golden-green ribbon seaweed.
5. Orange and magenta tube corals.
6. Low violet and turquoise coral garden.

## Animation and limitations

Creatures use predominantly horizontal patrols with slight depth drift and mirrored side-view imagery. Body, tail and tentacle motion is procedural. The original background’s coral and seaweed regions sway through small, anchored strip offsets. Water, bubbles, sunbeams and sand caustics also move independently. Pause stops renderer time and simulation, including every ambient layer. These are raster game sprites with procedural animation, not video clips or a hand-drawn frame-by-frame sequence.

Species labels describe recognisable generated animals; the art is illustrative rather than a scientific identification reference. Marine angelfish replace the old freshwater-style image. Chinese names favour familiar Hong Kong usage; examples checked against the Taiwan Fish Database include [鐵甲兵](https://fishdb.sinica.edu.tw/eng/species.php?id=380913) and [管口魚](https://fishdb.sinica.edu.tw/taxon/381091-fishdb).

The older generation recipes below are retained only for provenance. `reef.png` is now active again; `creatures.png` remains unused.

---

# Archived V1 artwork

Created with the built-in **imagegen** tool for this prototype. No stock or third-party art is fetched at runtime.

- `reef.png`: wide 16:9 pixel-art underwater environment, with open blue water and a sandy seabed framed by coral. No animals or baked-in interface.
- `creatures.png`: original 4-column × 6-row atlas of 24 individual marine animals.
- `creatures-clean.png`: transparency cleanup edit of the original atlas; this is the atlas used by the app.

The current code uses whole-atlas connected foreground components at runtime, with the grid serving only to identify each creature. It animates the independently rendered creature images with directional swimming, body/tail movement and pulsing, and creates water, light, bubbles and plant motion separately. These are procedural 2D animations, not video clips or hand-drawn multi-pose animation sets.

## Generation prompts

### Reef background

Use case: stylized-concept. Asset type: background painting for a browser-based pixel-art aquarium game for primary-school reading time.

Create a beautiful, premium, detailed 16-bit PIXEL ART underwater reef BACKGROUND ONLY, wide landscape 16:9 composition. No animals, no fish, no people, no text, no labels, no interface, no outer frame. Straight-on immersive aquarium interior, not a tank in a room.

Art direction: luminous turquoise water at the top grading to rich deep cerulean and petrol teal at the lower edges. Warm pale sandy seabed across the bottom quarter. Beautiful layered coral reef framing the left and right edges: sea fans, branching rose and lavender coral, chunky teal rocks, small coral gardens, a few lush kelp fronds. Open water should occupy approximately 65 percent of the scene across the middle and upper area, leaving generous uncluttered space for moving fish and a readable overlay. Small distant underwater rock silhouettes add depth. Calm bright clear water, beautiful natural underwater ambience, suitable for children but sophisticated.

Authentic crisp pixel clusters, consistent small square pixel grid, rich restrained colours, lovingly crafted game environment art; definitely pixel art, not soft painting or vector art. Pixel size appropriate to a 640x360 logical game canvas enlarged three times. Most plants and rocks sit at the bottom and sides. Subtle water illumination only; animated light rays and moving caustics will be added in code. No big hard sunbeams baked into the image, no stars, no sparkles, no bubbles baked in. Peaceful ocean, no wrecks, no ruins, no treasure chests. Scene must look excellent as the full-window aquarium background.

### Creature atlas

Use case: stylized-concept. Asset type: one production creature sprite atlas for a premium 16-bit pixel-art aquarium game.

Create ONE TRANSPARENT PNG SPRITE ATLAS containing precisely TWENTY-FOUR separate marine-animal sprites in a STRICT 4-COLUMN by 6-ROW evenly spaced grid. Portrait overall composition, 2:3 aspect ratio. Every cell is the same square size. Centre ONE complete isolated creature in each cell with generous transparent margins. NO background at all, no sand, no water, no rocks, no plants, no frames, no cell lines, no shadows underneath, no letters, numbers or labels. The grid is purely for layout. Absolutely no sprite crosses its cell boundary.

Style: authentic detailed crisp 16-bit game pixel art with a consistent square pixel grid, about 64x64 source pixels per creature enlarged sharply. Rich beautiful ocean colours, dark teal pixel outlines, small highlights, charming but recognisable natural animal anatomy, clear silhouettes, premium collectible sprites. All fish are SIDE VIEW FACING RIGHT, with tails at the left and eyes at the right. Other animals must be fully visible, with all tentacles/fins within their cell. Use comparable visual size within cells; the game will scale species separately. No soft blur, no realistic photo textures, no gradients outside creature edges.

Exact roster and grid order, left to right in each row:

- Row 1: clownfish; blue tang; yellow tang; butterflyfish.
- Row 2: damselfish; anchovy; sea star; hermit crab.
- Row 3: sardine; seahorse; pufferfish; jellyfish.
- Row 4: octopus; angelfish; cleaner shrimp; sea turtle.
- Row 5: stingray; lionfish; nautilus; cuttlefish.
- Row 6: mandarinfish; leafy seadragon; dolphin; whale shark.

All twenty-four creatures must be distinct, complete, separated and faithfully in this exact 4x6 order. Transparent background must be genuine alpha transparency, not a checkerboard drawing. This is one sprite atlas asset, not a poster or collage illustration.

### Transparency cleanup

Keep all twenty-four animal sprites, exact 4-column by 6-row layout, positions, dimensions, colours and crisp pixel-art anatomy unchanged. Remove every trace of the soft coloured background, soft haze, blurred halos, glow and shadows surrounding the creatures. Make all space outside each creature's crisp outer outline fully transparent with alpha zero. Preserve the creature pixels and delicate fins/antennae/tentacles. Pixel edges should be crisp. No extra objects, no text, no repositioning, no change of style. Output a genuine transparent-background PNG sprite atlas, not a checkerboard picture.
