# TODO — Sidebar + Mode Split (Analyzer vs Rewriter)

- [ ] Update `resume-viewer-frontend/src/App.tsx`:
  - [ ] Add sidebar with 2 clickable items
  - [ ] Add `activeMode` state (`analyzer` | `rewriter`)
  - [ ] Split UI rendering so only active mode’s UI exists
  - [ ] Hide Gemini rewrite card in analyzer mode
  - [ ] Add rewriter-only upload + rewrite button in rewriter mode
- [ ] Update `resume-viewer-frontend/src/styles.css`:
  - [ ] Add sidebar styles (aesthetic, active/hover states)
  - [ ] Add responsive layout styles for sidebar + content
- [ ] Manually test in browser:
  - [ ] Click Analyzer => rewriter hidden
  - [ ] Click Rewriter => analyzer hidden
  - [ ] Verify buttons only function in their respective modes

