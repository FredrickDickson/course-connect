# Design System Strategy: The Academic Ledger

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Global Arbitrator**. This system must feel less like a software interface and more like a high-end editorial publication or a private law library. We are moving away from the "SaaS-template" look by prioritizing intentional asymmetry, expansive white space, and a rejection of standard structural containers.

The goal is to convey "Prestige through Restraint." We achieve this by using a 12-column grid not as a cage, but as a guide for rhythmic, offset layouts where typography holds the weight that lines and boxes usually occupy.

---

## 2. Colors & Surface Philosophy
The palette is rooted in institutional heritage. We avoid pure white (#FFFFFF) in favor of a "richer cream" to evoke the feel of premium heavy-bond paper.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. Sectioning must be achieved through:
1.  **Background Color Shifts:** Moving from `surface` (#fbfaee) to `surface-container-low` (#f5f4e8).
2.  **Tonal Transitions:** Using subtle variations in the neutral scale to define areas of focus.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of vellum or fine parchment. 
*   **Base:** `surface` (#fbfaee)
*   **Tertiary Areas:** `surface-container` (#efeee3) for sidebars or secondary modules.
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) to provide a soft, "bright" lift against the cream background.

### The "Glass & Gradient" Rule
To bridge the gap between "Ivy League" and "Global Corporate," use Glassmorphism for floating navigation or modal overlays. 
*   **Token:** Use `surface` at 80% opacity with a `24px` backdrop-blur. 
*   **Gradients:** CTAs should use a subtle linear gradient from `primary` (#610000) to `primary_container` (#8b0000) at a 135-degree angle to provide a "silk-like" finish.

---

## 3. Typography: Editorial Authority
The typographic scale is designed for deep focus and high-level legibility.

*   **The Heroic Serif (Display & Headline):** `notoSerif` is our voice of authority. Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) for a custom, printed-press look.
*   **The Modern Utility (Body & Title):** `inter` provides the corporate, tech-forward edge. Use `body-lg` (1rem) for long-form legal case studies to ensure maximum readability.
*   **The Technical Label:** `workSans` (Label tokens) is reserved for metadata, micro-copy, and breadcrumbs, providing a crisp, functional contrast to the serif headings.

---

## 4. Elevation & Depth
We reject the heavy drop-shadows of consumer apps. Depth is achieved through **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on top of a `surface-container-low` background. The contrast is enough to define the object without a shadow.
*   **Ambient Shadows:** If a floating element (like a dropdown) is required, use an "Atmospheric Shadow": `0px 20px 40px rgba(27, 28, 21, 0.06)`. This mimics soft, natural gallery lighting.
*   **The "Ghost Border" Fallback:** If a boundary is strictly required for accessibility, use `outline_variant` (#e3beb8) at **15% opacity**. It should be felt, not seen.

---

## 5. Components & Primitives

### Buttons: The Signature Action
*   **Primary:** Solid `primary` (#610000) with `on_primary` (#ffffff) text. Corners are set to `sm` (0.125rem) for a sharp, tailored appearance.
*   **Secondary:** Ghost style. No background, `outline` (#8e706b) at 20% opacity for the frame, and `primary` for the text.
*   **Padding:** High horizontal padding (e.g., `2rem` on a `3rem` height) to create a "letterbox" feel.

### Input Fields: The Minimalist Ledger
*   **Style:** No background fill. Only a bottom border of `outline` (#8e706b) at 40% opacity. Upon focus, the border transitions to `secondary` (#745b22) and thickens to 2px.
*   **Labels:** Always use `label-md` in `on_surface_variant` (#5a403c).

### Cards & Modules
*   **Rule:** Forbid divider lines.
*   **Separation:** Use vertical white space (32px, 48px, or 64px) or a shift to `surface_container_high` (#e9e9dd) backgrounds.
*   **Content:** Text within cards should be "optical-center" aligned rather than strictly mathematically centered to feel more organic.

### Global Navigation: The Floating Header
*   **Execution:** A semi-transparent `surface` bar with a `0.5px` Ghost Border on the bottom. It should feel like it's hovering over the content as the user scrolls through the curriculum.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Place a `headline-lg` in the first 4 columns of the 12-column grid, and let the body text start at column 6. This creates a "breathable" editorial layout.
*   **Use Intentional Scaling:** Use `display-lg` sparingly to highlight "Premium Insights" or "Key Legal Precedents."
*   **Respect the Cream:** Ensure the `background` (#fbfaee) is the dominant color; it is the "paper" that holds the intelligence.

### Don’t:
*   **Don’t use 100% Black:** Never use #000000. Use `on_surface` (#1b1c15) for text to maintain a sophisticated, softened contrast.
*   **Don’t use Large Border Radii:** Avoid `xl` or `full` rounded corners for main UI elements. We want the sharp, precise edges of a corporate skyscraper, not the "bubbly" feel of a social app.
*   **Don’t Crowd the Content:** If you think there is enough white space, add 16px more. High-prestige users value their cognitive load; do not clutter their field of vision.