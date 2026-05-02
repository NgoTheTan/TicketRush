---
name: Kinetic Precision
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#41485e'
  on-tertiary: '#ffffff'
  tertiary-container: '#586076'
  on-tertiary-container: '#d4dbf5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  h1:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  tabular-nums:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

The design system is engineered to bridge the gap between high-energy entertainment and rigorous transactional reliability. It targets a dual audience: the excited ticket buyer looking for seamless discovery, and the professional event organizer requiring data integrity.

The style is **Corporate / Modern** with a focus on high-clarity information architecture. It leverages a clean, systematic approach that prioritizes content—specifically event photography and seating logistics—over decorative elements. The aesthetic evokes "Trust through Clarity," ensuring users feel secure during high-pressure "on-sale" moments. For the Vietnamese market, the UI maintains an international standard while optimizing for dense information display common in local e-commerce patterns.

## Colors

The palette is bifurcated to serve two distinct user mentalities.

**Customer UI:** Utilizes a "High-Visibility Light" mode. The background is a very light gray to reduce glare while maintaining a crisp paper-like feel. **Modern Indigo** (#4F46E5) serves as the primary action color, providing a sense of technological sophistication. **Mint Green** (#10B981) is used for secondary accents, success states, and the "Available" seat status, symbolizing go-ahead and freshness.

**Admin & Seat Map UI:** Switches to a **Clean Navy** theme. This is not a neon "dark mode," but a professional workspace palette using deep slates and navies to reduce eye strain during prolonged data management. 

**Semantic Colors:**
- **Selling:** Mint Green (Positive growth).
- **Sold Out:** Soft Red (Clear finality).
- **Coming Soon:** Amber (Anticipation).
- **Locked/Reserved:** Slate Gray (Neutrality).

## Typography

The design system uses **Inter** exclusively to ensure maximum legibility for Vietnamese diacritics and complex character strings. 

- **Headlines:** Use tight letter-spacing and bold weights to create impact for event titles.
- **Body:** Generous line heights are maintained to handle Vietnamese tone marks without clipping or visual clutter.
- **Data Display:** For countdown timers and admin tables, the system employs **Tabular Numerals** to prevent "jumping" text during live updates.
- **Hierarchy:** Strict adherence to font-weight variance (400 vs 600) is used instead of color variation to denote importance, ensuring accessibility.

## Layout & Spacing

This design system follows a **12-column Fixed Grid** for the customer web interface, transitioning to a **Fluid Grid** for the Admin Dashboard to maximize screen real estate for charts and tables.

- **The 4px Base:** All spacing is a multiple of 4.
- **Content Density:** In the Customer UI, `lg` (24px) spacing is used between sections to provide breathing room. In the Admin UI, the scale shifts down to `sm` (8px) and `md` (16px) to allow for data-heavy views without excessive scrolling.
- **Vietnamese Context:** Buttons and labels are designed with 15% extra horizontal padding to accommodate longer localized strings (e.g., "Mua vé ngay" vs "Buy now").

## Elevation & Depth

The design system utilizes **Tonal Layers** and **Ambient Shadows** to create a structured hierarchy without visual noise.

- **Level 0 (Base):** Neutral background (#FAFAFA).
- **Level 1 (Cards):** White background with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)). This is the primary container for event listings.
- **Level 2 (Modals/Dropdowns):** White background with a more pronounced shadow (0px 10px 30px rgba(0,0,0,0.08)) and a 1px border in a slightly darker neutral tone.
- **Admin Specific:** Depth is achieved through "Inverted Layering." Darker shades of navy are used for the background, while lighter navy shades denote interactive panels and surfaces.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a professional, "stable" look that feels more precise and commercial than highly rounded "bubbly" designs.

- **Small Components:** Checkboxes and small buttons use the 0.25rem (4px) radius.
- **Medium Components:** Event cards and input fields use the 0.5rem (8px) radius.
- **Large Components:** Hero sections and large modals use the 0.75rem (12px) radius.
- **The "Pill":** Exclusively reserved for Status Badges (Selling, Sold Out) to make them instantly recognizable as distinct from interactive buttons.

## Components

### 1. Event Cards
- **Structure:** Large 16:9 or 4:5 aspect ratio image at the top.
- **Details:** Title (H3), Date/Time with an icon, and a price range.
- **Badges:** Floating in the top-left corner of the image using the pill-shape.

### 2. Seat Matrix Icons
- **Available:** 24px square with 4px radius, Mint Green outline, White fill.
- **Selected:** Solid Indigo fill with a checkmark icon.
- **Sold:** Light Gray fill with a diagonal "X" line.
- **Locked:** Slate Gray fill with a small padlock icon.

### 3. Countdown Timers
- **Style:** Monospaced (Tabular Nums) characters.
- **Container:** High-contrast Indigo background with White text for "Live" sales; Red background for "Ending Soon."

### 4. Admin Tables
- **Design:** Borderless rows with 1px horizontal dividers.
- **Interactions:** Subtle hover state (1% lighter than background). 
- **Typography:** Shifted to `body-sm` (14px) for maximum data density.

### 5. Buttons
- **Primary:** Solid Indigo, white text, bold weight.
- **Secondary:** White background, Indigo 1px border.
- **Admin Action:** Solid Mint Green for "Publish/Save."

### 6. Status Badges
- **Context:** Use localized Vietnamese labels: "Đang bán" (Selling), "Hết vé" (Sold Out), "Sắp diễn ra" (Coming Soon).
- **Color Coding:** Backgrounds use 10% opacity of the semantic color, text uses 100% opacity of the same color for high legibility.