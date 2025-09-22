# Screenplay Scene Header Diagnostic Report

## 1. Code surface map

| Concern | File & Lines | Notes |
| --- | --- | --- |
| Runtime scene-header DOM generation | `packages/shared/screenplay/agents.ts` L80-L123 | `SceneHeaderAgent` creates the combined container, spans for `scene-header-1/2`, and a dedicated block for `scene-header-3` when a specific place exists.【F:packages/shared/screenplay/agents.ts†L80-L123】 |
| Formatting profile used by agents & re-application | `packages/shared/screenplay/formatStyles.ts` L22-L75 | `getFormatStyles` merges base RTL styles with per-class overrides (now including block-level/centering attributes).【F:packages/shared/screenplay/formatStyles.ts†L22-L76】 |
| Editor content injection & post-processing | `apps/frontend/src/features/screenplay/components/ScreenplayEditor.tsx` L183-L328 | New `setEditorContent` helper rehydrates HTML from pipeline/toolbar flows and invokes `applySceneHeaderStyles` before pagination; paste/file handlers now rely on it.【F:apps/frontend/src/features/screenplay/components/ScreenplayEditor.tsx†L183-L328】 |
| Advanced toolbar import & manual edits | `apps/frontend/src/features/screenplay/components/ScreenplayEditor.tsx` L555-L579 | Advanced clipboard + smart editing toolbars now funnel updates through `setEditorContent`, ensuring the scene-header styles are re-applied consistently.【F:apps/frontend/src/features/screenplay/components/ScreenplayEditor.tsx†L555-L576】 |
| Runtime style re-application utility | `apps/frontend/src/features/screenplay/utils/applySceneHeaderStyles.ts` L1-L42 | Traverses imported content and merges computed format styles into inline styles so that dynamic inserts keep the expected formatting.【F:apps/frontend/src/features/screenplay/utils/applySceneHeaderStyles.ts†L1-L42】 |
| Global CSS baseline for scene headers | `apps/frontend/src/styles/index.css` L112-L177 | Adds canonical class rules for `.scene-header-1/2/3`, top-line, and container to guarantee centering/whitespace even without inline overrides.【F:apps/frontend/src/styles/index.css†L112-L177】 |
| Tailwind purge protection | `configs/tailwind.config.ts` L3-L7 | Safelists the scene-header class names so production builds keep the global styles alive.【F:configs/tailwind.config.ts†L3-L7】 |

## 2. Root cause analysis

1. **Missing reusable styling pass.** When HTML reached the editor through the advanced clipboard importer or smart toolbar, the code wrote raw markup (`innerHTML = content`) and only paginated afterwards. No follow-up styling pass ran for these flows, so the `scene-header-*` elements kept only their class attributes.【F:apps/frontend/src/features/screenplay/components/ScreenplayEditor.tsx†L555-L576】
2. **No global CSS fallback.** The only centering rules lived inside an inline `<style>` block, meaning any consumer of the generated HTML outside `ScreenplayEditor` (e.g. pipeline previews, exports, cached HTML) saw unstyled headers. Because the markup is RTL, the default browser alignment is `text-align: start` (right), which matches the observed “wrong” screenshot where `scene-header-3` hugs the margin.
3. **Dynamic class purge risk.** Production builds run Tailwind's purge. Without a safelist and without global CSS, any asset that relied on class selectors could lose them entirely once shaken, exacerbating the issue in production.

Combined, these paths left `scene-header-3` (and partially 1/2) without enforced centering, padding, or underline. The issue was systemic: every header class lost its bespoke rules whenever HTML bypassed the specific paste/file handlers or when viewing saved HTML outside the live editor.

## 3. Impact by header level

- **`scene-header-1`** lost block-level layout and uppercase centering whenever the inline styles were missing, causing number/time rows to collapse towards the right margin.【F:packages/shared/screenplay/formatStyles.ts†L22-L34】
- **`scene-header-2`** similarly fell back to the RTL default and floated right instead of balancing the top line.【F:packages/shared/screenplay/formatStyles.ts†L35-L47】
- **`scene-header-3`** was most visible: without explicit centering, background, or underline, it rendered as ordinary right-aligned text, breaking the “right” reference layout.【F:apps/frontend/src/styles/index.css†L145-L155】 The Playwright regression guard now asserts centered alignment within ±2 px of the geometric midpoint.【F:tests/e2e/scene-header.spec.ts†L8-L37】

## 4. Confirmed resolution

- All entry points that mutate editor HTML now call `setEditorContent`, which injects the markup, reruns `applySceneHeaderStyles`, and only then paginates.【F:apps/frontend/src/features/screenplay/components/ScreenplayEditor.tsx†L191-L263】
- `applySceneHeaderStyles` centralises the runtime inline-style merge so that imported HTML (from AI pipelines, toolbar reclassification, or saved drafts) always regains the expected formatting, including centering for level 3.【F:apps/frontend/src/features/screenplay/utils/applySceneHeaderStyles.ts†L1-L42】
- Global CSS ensures any consumer of the markup—preview pages, exported HTML, or Playwright snapshots—keeps the same appearance even if inline styles are stripped.【F:apps/frontend/src/styles/index.css†L118-L177】
- Tailwind safelist prevents production purge from discarding the new base rules.【F:configs/tailwind.config.ts†L3-L7】
- Automated coverage: unit tests assert `getFormatStyles` still returns the centering contract and the runtime helper applies it.【F:packages/shared/screenplay/__tests__/formatStyles.test.ts†L4-L16】【F:apps/frontend/src/features/screenplay/utils/applySceneHeaderStyles.test.ts†L5-L20】 The Playwright check verifies true visual centering.【F:tests/e2e/scene-header.spec.ts†L8-L37】

**Conclusion:** The root cause was the lack of a shared styling reapplication path combined with missing global CSS, leading to right-aligned `scene-header-3` blocks whenever content bypassed the inline style injector. The fixes install a guaranteed styling pipeline and baseline CSS, producing the expected centred layout in both development and production flows.
