# SOCIONET Shield — Cybersecurity Feature Design System

**Aesthetic:** Futuristic AI-powered cybersecurity dashboard. Glassmorphic dark mode with neon glow effects. Animated radar visualization. Three-state threat detection (green/amber/red). Premium mobile-first design with spring animations.

| Section | Specification |
|---------|---------------|
| **Color Palette** | Primary: 0.68 0.32 195 (neon cyan) • Secondary: 0.72 0.30 185 (cyan glow) • Accent: 0.68 0.35 320 (magenta) • Background: 0.08 0.08 280 (deep navy) • Card: 0.14 0.10 280 (frosted glass) |
| **Cyber Colors** | Safe: 0.82 0.32 140 (neon green) • Moderate: 0.76 0.35 65 (neon amber) • Dangerous: 0.68 0.35 25 (neon red) — glow shadows & pulse animations |
| **Typography** | Display: Space Grotesk 700/600 • Body: Inter 400/500 • Mono: JetBrains Mono 400 |
| **Glass Effects** | blur(24px) cards, blur(32px) panels, 0.6-0.8 alpha, inset+outer glow, border 1px rgba(255,255,255,0.1) |
| **Shield Display** | Centered shield icon 96px, pulsing glow filter. Radar rings: 3 concentric circles, scale 1→3, opacity fade, staggered 0.4s, 2s ease-out |
| **Risk Meter** | Progress arc 0-100, gradient color-coded (green/amber/red), smooth 500ms transition |
| **Threat Cards** | Glassmorphic 12px radius, icon+text, border-left 2px, expandable detail, 200ms spring |
| **Animations** | Cyber-radar 2s scale infinite • Cyber-scan 1.5s clip-path • Safe/Warning/Danger-pulse 1.5s glow • Shield-glow 2s filter • Spring: cubic-bezier(0.34, 1.56, 0.64, 1) |
| **Spacing** | Mobile 12px, tablet 16px, desktop 20px. Cards edge-to-edge with 3px padding. Touch 48px min. |
| **Mobile-First** | Full-width, 2-col status grid on mobile, 4-col desktop, below bottom nav, 44px targets |
| **Constraints** | OKLCH only, spring easing, blur+transparency always, neon for status/danger, no bouncy, reduced-motion respected |
| **Signature** | Animated radar + three-state threat viz + glassmorphic depth + neon glow + shield animation = Futuristic AI security dashboard |

**Components:** ShieldPage (dashboard), ShieldDetailPage (threats), ShieldWidget (badge), CyberRadarEffect (SVG), SecurityMeter (arc)
**CSS Vars:** --cyber-safe/moderate/dangerous + foreground pairs | **Shadows:** shadow-cyber-safe/moderate/dangerous | **Keyframes:** cyber-radar, cyber-scan, safe/warning/danger-pulse, shield-glow
