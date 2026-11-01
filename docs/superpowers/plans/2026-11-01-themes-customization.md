# Themes, Categories and Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every account reshape Rooznegar: six palettes × light/dark × five accents, custom categories with tones/icons, a fully editable weekly template, profession presets, module toggles, garden rules and bloom styles.

**Architecture:** Appearance is computed in TypeScript (`src/lib/appearance.ts`) into CSS custom properties, applied on `<html>` at first paint by an inline script and kept in sync by `ThemeSync`. Categories become string ids backed by `CategoryDef[]`; the schedule is rebuilt from the user's `WeekTemplate` instead of hard-coded routines, with profession presets only seeding/transforming that template.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript strict, Tailwind v4 + hand-written CSS tokens, Zustand persist, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-accounts-landing-customization-design.md` (sections 6–8).

## Global Constraints

- RTL Persian copy, Vazirmatn, calm tone; no shaming colors.
- All data stays in the existing per-user store key and sync snapshot; no new secrets.
- Static export must keep working (no server-only APIs in client code).
- Only `NEXT_PUBLIC_SUPABASE_*` may reach the client.
- Every interactive change must persist through `updatedAt` and sync.
- TypeScript strict + ESLint + 38 existing tests must stay green.

---

### Task 1: Appearance engine

**Files:**
- Create: `src/lib/appearance.ts`
- Create: `src/lib/appearance.test.ts`
- Modify: `src/lib/palettes.ts` (tone catalog + helpers export)

**Interfaces:**
- Produces: `parseHex`, `mix`, `contrastRatio`, `ensureContrast`, `appearanceVars(paletteId, accentId, mode, bloomStyle)`, `PALETTE_PRELOAD: Record<string, Record<string,string>>`, `applyAppearance(settings)`, `resolveMode(theme)`.
- `applyAppearance` sets `data-theme`, `data-palette`, `data-bloom`, writes inline CSS vars, persists `rz-appearance`, updates theme-color metas.

**Steps:**
1. Write failing contrast tests across 6 palettes × 2 modes × 5 accents (ink/paper ≥ 7, muted/surface ≥ 4.5, faint/surface ≥ 3, btn ink/btn bg ≥ 4.5, tone ink/tone soft ≥ 4.5).
2. Run `npx vitest run src/lib/appearance.test.ts` → fail.
3. Implement color math + token derivation.
4. Re-run → pass.

### Task 2: First-paint appearance

**Files:**
- Modify: `src/app/layout.tsx` (inline script reads `rz-theme` + `rz-appearance`, applies preload tokens)
- Modify: `src/components/Providers.tsx` (`AppearanceSync` replaces `ThemeSync`, applies palette/accent/bloom, listens to system changes)
- Modify: `src/lib/defaults.ts` (`APPEARANCE_KEY`)
- Modify: `src/components/Bloom.tsx` (petal vars `--petal-1..5`)
- Modify: `src/app/globals.css` (accent/tone/category variables, customization UI styles)

**Steps:** write preload script, apply on hydrate/settings change, update meta theme-color, verify no flash by hard-reloading demo.

### Task 3: Category model

**Files:**
- Modify: `src/lib/types.ts` (`Category = string`, `CategoryDef.rest?`)
- Modify: `src/lib/categories.ts` (`categoryDef`, `categoryMeta`, `CATEGORY_TONES`, new builtins `craft`, `study`, `training`, `isRest`, `isGrowth`)
- Modify: `src/lib/migrate.ts` (merge missing builtins into persisted categories)
- Modify: `src/lib/schedule.ts`, `src/lib/stats.ts`, `src/lib/store.ts` (string categories, rest/growth flags)
- Modify: Today, Week, Overlays, Landing usages of `CATEGORY_META`/`cat-${category}`
- Test: `src/lib/categories.test.ts`

**Steps:** change type, add helpers and fallback, replace classes with `cat-tone-${tone}`, update tests.

### Task 4: Template engine + presets

**Files:**
- Create: `src/lib/templates.ts` (`TEMPLATE_PRESETS`, `presetWeekTemplate`, `ensurePresetCategories`)
- Create: `src/lib/templates.test.ts`
- Create: `src/lib/schedule.test.ts`
- Modify: `src/lib/schedule.ts`:
  - rename current builder to `buildLegacyDaySchedule`
  - export `legacyWeekTemplate(settings)`
  - new `buildDaySchedule(dateKey, settings, mode?, template?, categories?)`
  - late mode shifts non-fixed blocks by `lateShiftMinutes`; overflowing core/compensable blocks become recoverable
  - `isWorkday(dateKey, settings?)`, `skipCandidates(schedule)`, `buildShiftProposal(..., template?, categories?)`
  - `bigTask` = first growth core block
- Modify: `src/lib/migrate.ts` (`defaultWeekTemplate` delegates to presets)
- Modify: `src/lib/stats.ts` (`PlannerData`, schedule from template, gym counted by module/name, bloom rules)
- Modify callers: Today, Week, Progress, Overlays, NotificationsManager, AppShell.

**Tests:** template renders 7 days; late shift/recover; preset categories all defined; custom block engine preserves overrides.

### Task 5: Store actions

**Files:**
- Modify: `src/lib/store.ts`
- Create: `src/lib/store.customize.test.ts`

**Interfaces:**
- `addCategory(input) => string`
- `updateCategory(id, patch)`
- `removeCategory(id, transferTo)`
- `updateWeekTemplate(template)`
- `applyTemplate(templateId)` (sets preset, ensures categories)
- `updateSettings` reapplies appearance.

**Removal rule:** builtin categories cannot be deleted, only edited; custom deletion reassigns every `TemplateBlock.categoryId` to `transferTo` first.

### Task 6: Editors and Me customization

**Files:**
- Create: `src/app/(app)/(planner)/me/appearance/page.tsx`
- Create: `src/app/(app)/(planner)/me/categories/page.tsx`
- Create: `src/app/(app)/(planner)/me/template/page.tsx`
- Modify: `src/app/(app)/(planner)/me/page.tsx` (customize hub, modules, garden rule, bloom style, late rhythm)

**Behavior:** appearance page = live palette/accent/preview; categories page = inline label/icon/tone edits, add, delete-with-transfer; template page = 7 day tabs, edit title/time/category/core/compensable, add/delete/duplicate blocks, reset to preset.

### Task 7: Modules, garden rule, onboarding, QA

**Files:**
- Modify: `src/app/(app)/onboarding/page.tsx` (4 steps: name, rhythm, profession, look)
- Modify: Today/Progress/Week/AppShell (module flags, bloom rule/style)
- Modify: `src/lib/stats.ts` (`bloomOf(plan, rule, schedule)`, `gardenFor(data,...)`, `streakOf(data,...)`)
- Run: `npm run lint`, `npx vitest run`, `NEXT_PUBLIC_BASE_PATH= npm run build`, browser QA at `http://localhost:3000`.

**QA checklist:** palette switch persists across reload; accent changes buttons and category chips; custom category appears in template editor and Today; delete transfers blocks; profession preset rebuilds week; module off hides its surfaces; garden rule changes blooms; no console errors; production build still gates unauthenticated users.
