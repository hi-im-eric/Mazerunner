# Fantasy Asset Generation Prompts

Use these prompts with an image generator (ChatGPT DALL-E, Midjourney, etc.) to create a visually consistent set of assets for the MazeRunner fantasy theme.

## Style Guide (include with every prompt)

All assets should share this visual language:
- **Style:** Dark fantasy / medieval dungeon aesthetic
- **Palette:** Deep browns, blacks, warm amber/orange firelight, muted golds, dark stone grays
- **Lighting:** Warm torchlight, rim lighting, dramatic shadows
- **Texture:** Weathered stone, aged wood, tarnished metal, ancient parchment
- **Background:** Transparent or solid black (for compositing over dark UI)
- **Render style:** Painterly digital illustration, semi-realistic, suitable as UI decoration at low opacity

---

## 1. Sidebar Compass

**Dimensions:** 800 x 800 px (square)
**Used for:** Centered decoration at bottom of the sidebar navigation panel, displayed at ~30% opacity

**Prompt:**
> A mystical runic compass rose viewed from above, dark fantasy style. Intricate brass and iron construction with glowing amber rune markings around the outer ring. The cardinal directions are marked with arcane symbols instead of N/S/E/W. A faintly glowing crystal at the center. The compass sits on dark weathered stone. Dark background, warm torchlight illumination. Painterly digital illustration, suitable as a subtle UI background element. 800x800 pixels.

---

## 2. Content Background — Arcane Library

**Dimensions:** 1600 x 900 px (16:9 landscape)
**Used for:** Full-bleed background behind the main content area, displayed at ~14% opacity

**Prompt:**
> Interior of a vast medieval arcane library, viewed from a low angle. Towering dark wooden bookshelves stretching into shadow, filled with ancient leather-bound tomes and scrolls. Warm amber torchlight casts dramatic shadows between the shelves. A few floating magical orbs provide dim blue-white light in the distance. Stone floor with worn rugs. Dust motes visible in the light beams. Dark, moody atmosphere. Painterly digital illustration, wide cinematic composition. 1600x900 pixels.

---

## 3. Card Decoration — Ancient Scroll

**Dimensions:** 800 x 800 px (square)
**Used for:** Decorative overlay on data cards, displayed at ~30% opacity in a corner

**Prompt:**
> A single unfurled ancient parchment scroll on a dark background. The scroll is weathered and slightly torn at the edges, with faded arcane text and a wax seal visible. A quill pen rests beside it. Warm candlelight illumination from one side. Dark fantasy style, painterly digital illustration. The composition should work as a corner decoration element. Dark or transparent background. 800x800 pixels.

---

## 4. Card Decoration — Goblin Scribe

**Dimensions:** 800 x 800 px (square)
**Used for:** Decorative overlay on data cards, displayed at ~28% opacity in a corner

**Prompt:**
> A small goblin hunched over a writing desk, scribbling in a large leather ledger with a feather quill. Green-skinned with pointed ears and a mischievous expression. Wearing a tattered brown robe. A single candle on the desk illuminates the scene with warm amber light. Ink bottles and crumpled parchment scattered around. Dark moody background. Dark fantasy style, painterly digital illustration. The composition should work as a corner decoration element. 800x800 pixels.

---

## 5. Card Decoration — Fantasy Marketplace

**Dimensions:** 800 x 800 px (square)
**Used for:** Decorative overlay on data cards, displayed at ~25% opacity centered at bottom

**Prompt:**
> A medieval fantasy marketplace stall viewed from the front. Wooden market stand with a tattered canvas awning, displaying mysterious wares: glass vials, bundled herbs, small chests, hanging lanterns. A hooded merchant stands behind the counter. Warm firelight from nearby braziers. Cobblestone ground. Dark atmospheric background with hints of other stalls fading into shadow. Dark fantasy style, painterly digital illustration. 800x800 pixels.

---

## 6. Card Decoration — Potion Collection

**Dimensions:** 800 x 800 px (square)
**Used for:** Decorative overlay on data cards, displayed at ~35% opacity in a corner

**Prompt:**
> A collection of 3-4 fantasy potion bottles on a dark stone shelf. Each bottle is a different shape — one tall and slender, one round and squat, one with a long curved neck. The liquids glow faintly in different colors: emerald green, deep amber, and pale violet. Cork stoppers with wax seals. A few dried herbs and a small mortar and pestle beside them. Warm torchlight from the side. Dark background. Dark fantasy style, painterly digital illustration. 800x800 pixels.

---

## 7. Header Torch

**Dimensions:** 400 x 800 px (1:2 portrait, tall)
**Used for:** Flanking the left and right edges of the header bar, large and prominent

**Prompt:**
> A single medieval wall-mounted torch sconce, viewed straight on. Ornate wrought iron bracket with a dark metal torch holder. The torch is lit with a bright, dynamic orange-amber flame at the top. Glowing embers drift upward. The iron bracket has subtle decorative scrollwork. The flame should be the brightest element. Dark stone wall background that blends to black at the edges. Dark fantasy style, painterly digital illustration. Vertical composition with the flame at the top third. 400x800 pixels.

---

## 8. Goblin Popout Character

**Dimensions:** 800 x 1000 px (4:5 portrait)
**Used for:** Animated character that peeks in from the right edge of the screen on scroll

**Prompt:**
> A mischievous goblin character peeking out from behind a stone wall edge, viewed from the chest up. Green skin, large pointed ears, wide yellow eyes with slit pupils, a toothy grin. Wearing a tattered leather hood and shoulder armor. One clawed hand grips the stone edge. The goblin is positioned on the left side of the frame, as if leaning around a corner. The right side of the image should be empty/transparent for compositing. Dark dungeon background. Dark fantasy style, painterly digital illustration. 800x1000 pixels.

---

## Notes

- **Card assets (3-6) must all be 800x800** so they render at consistent visual weight when placed on cards
- After generation, verify that each image works at 25-35% opacity over a dark background — details should be visible but not overwhelming
- If the generator doesn't support transparent backgrounds, generate on solid black — the low opacity compositing will handle the blending
- The header torch will be mirrored horizontally for the right side, so make sure it looks natural flipped
