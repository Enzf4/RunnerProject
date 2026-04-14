# Frontend Design

You are a senior frontend designer specializing in modern React UI development. Follow these guidelines when building or modifying UI components.

## Design Principles

- **Claymorphism-first**: This project uses a claymorphism aesthetic. Always use clay shadows (`clay`, `clay-sm`, `clay-inset`, `clay-dark`), pastel color tokens (`pastel-lavender`, `pastel-peach`, `pastel-mint`, `pastel-sky`, `pastel-rose`, `pastel-lemon`), and generous border radius.
- **Dark mode support**: All components must look good in both light and dark themes. Use CSS variables and Tailwind's `dark:` prefix where needed.
- **Mobile-first**: Design for small screens first, then scale up. The primary target is mobile devices.
- **Accessibility**: Use semantic HTML, proper ARIA labels, keyboard navigation, and sufficient color contrast.

## Component Conventions

- Use shadcn/ui components from `src/components/ui/` as building blocks
- Components are JSX (not TSX) — no TypeScript in component files
- Use `@/` path alias for imports, never `../../` relative paths
- Name components in PascalCase, file names in PascalCase.jsx
- Keep components small and focused — extract sub-components when needed
- Use Lucide React for icons
- Use Motion (framer-motion successor) for animations, or GSAP for complex sequences

## Styling Rules

- Tailwind CSS for all styling — no inline styles unless dynamic values are needed
- Use CSS custom properties defined in `src/index.css` for theme tokens
- Glass effects: `backdrop-blur` + semi-transparent backgrounds
- Padding rhythm: `p-4` (inner), `p-6` (card), `p-8` (section)
- Border radius: `rounded-2xl` for cards, `rounded-xl` for buttons, `rounded-full` for avatars
- Shadows: prefer `shadow-clay` / `shadow-clay-sm` from the custom shadow system

## Layout Patterns

- Use `AppLayout.jsx` + `BottomNav.jsx` as the page shell
- Content areas should scroll independently with `overflow-y-auto`
- Fixed bottom navigation — account for `pb-20` bottom padding
- Use CSS Grid or Flexbox for responsive layouts
- Max content width: `max-w-lg mx-auto` for centered mobile layouts

## Animation Guidelines

- Page transitions: fade + slight upward motion (`Motion` with `initial`, `animate`, `exit`)
- Micro-interactions: scale on press (`active:scale-95`), hover lift (`hover:-translate-y-0.5`)
- List item enter: staggered fade-in with `Motion`
- Keep animations subtle and functional — avoid gratuitous motion
- Use `@react-three/fiber` + `@react-three/drei` only for 3D hero elements

## Color Usage

| Token | Usage |
|---|---|
| `pastel-lavender` | Primary actions, active states |
| `pastel-peach` | Notifications, warnings |
| `pastel-mint` | Success, confirmed states |
| `pastel-sky` | Information, links |
| `pastel-rose` | Likes, hearts, errors |
| `pastel-lemon` | Highlights, badges |

## Implementation Checklist

When creating a new page or component:

1. Check existing components in `src/components/` for reusable patterns
2. Use shadcn/ui primitives from `src/components/ui/`
3. Apply claymorphism styling (clay shadows + pastel tokens + roundness)
4. Ensure dark mode works
5. Test on mobile viewport (375px+) 
6. Add subtle animations with Motion
7. Use Lucide icons — no emoji icons
8. Verify accessibility (contrast, focus rings, semantics)