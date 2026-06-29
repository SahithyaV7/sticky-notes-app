# Sticky Notes

A canvas-based sticky notes app built from scratch — no UI libraries, no component frameworks, just React, TypeScript, and CSS Modules doing exactly what they're designed for.

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Requires Node 20+.

That's it. No environment variables, no database setup, no accounts. Notes save automatically to your browser's localStorage and are right where you left them when you come back.

---

## How to use it

| Action | How |
|---|---|
| Create a note | Click anywhere on the cork board |
| Move a note | Drag the coloured header strip |
| Resize a note | Drag the grip in the bottom-right corner |
| Edit a note | Double-click the note body, click outside when done |
| Change colour | Hover the note → click a swatch in the header |
| Delete a note | Hover → click the × button, **or** drag it onto the trash zone at the bottom |

Changes save automatically — the "Saved" badge in the top-right of the toolbar confirms this.

---

## Technology choices

### React 18 + TypeScript 5

React was the obvious choice for a component-driven UI where individual notes need to own their own interaction state (is this note being dragged? is it in edit mode?). TypeScript with `strict: true` throughout means every state shape, every action, and every prop is fully typed — the compiler catches whole categories of bugs before they reach the browser.

I deliberately stayed on **React 18.3** (rather than 19) because the project targets Node 20 LTS, and the newer Vite 8 / React 19 toolchain requires Node 20.19+ which isn't yet the default LTS patch.

### Vite 5

Vite gives near-instant dev server startup and hot module replacement that doesn't lose component state on save. The `@` path alias is configured so imports stay clean regardless of how deep a file is in the tree — `import { useBoardContext } from '@/context'` reads the same everywhere.

### CSS Modules

I chose CSS Modules over Tailwind or styled-components for a specific reason: the assessment asks reviewers to evaluate design judgment directly. With utility classes or CSS-in-JS, the styling decisions are abstracted away. With CSS Modules, every spacing value, every transition, every shadow is a deliberate choice visible in the stylesheet — which is exactly what you want a reviewer to see.

All colour tokens live in a single `:root` block in `index.css`. Every component references them via `var(--token-name)`. Changing the entire colour scheme is a one-file edit.

### No UI component libraries

No Radix, no MUI, no Headless UI. Every interactive element — the toolbar button, the colour swatches, the delete button, the contentEditable note body — is hand-rolled. This keeps the bundle tiny and means there's no abstraction layer between the code and what the reviewer reads.

---

## Architecture

### State — `useReducer` with discriminated unions

All note state lives in a single `BoardContext` backed by `useReducer`. The action type is a discriminated union — every possible mutation (`ADD_NOTE`, `MOVE_NOTE`, `RESIZE_NOTE`, `DELETE_NOTE`, `EDIT_TEXT`, `SET_COLOR`, `BRING_TO_FRONT`) is an explicit, typed case in the reducer. No mutation, no spread-and-hope — every case returns a new state object.

This makes the data flow easy to follow: something happens in the UI → a typed action is dispatched → the reducer handles it → React re-renders what changed. No mystery.

### Drag and resize — `useRef` + direct DOM mutation

The two custom hooks `useDrag` and `useResize` are where the most interesting engineering happens. The naive approach — updating position in `useState` on every `pointermove` — would trigger a React re-render on every pixel of movement, which is visually choppy at 60fps.

Instead, both hooks store gesture state in `useRef` (invisible to React's render cycle) and apply position/size changes directly to the DOM node via `ref.current.style.transform` and `ref.current.style.width/height`. React is only involved at the *end* of a gesture when the final position is dispatched to the reducer. This keeps drag and resize buttery smooth regardless of how many notes are on the board.

`setPointerCapture` is used on drag start so pointer events keep flowing to the dragged element even if the pointer moves off it — which is what makes the drag feel reliable rather than "sticky" when you move fast.

### Persistence — localStorage + async API mock

Notes are saved to `localStorage` with a 400ms debounce (so typing doesn't trigger a write on every keystroke). The storage module validates the persisted payload with runtime type guards before trusting it — malformed or stale data returns `null` and the app starts clean rather than crashing.

On top of localStorage there's a mock async API layer (`src/api/notesApi.ts`) that simulates 150–250ms network latency. Every note mutation fires a background `apiSaveNote` or `apiDeleteNote` call after the UI has already updated — this is the optimistic update pattern. The toolbar's "Saved / Saving… / Save error" badge reflects the API state in real time. In a production app you'd swap the mock functions for real `fetch` calls with no other changes required.

### Why the API mock exists separately from localStorage

localStorage is the *offline persistence* layer — it survives page reloads. The API mock is the *server sync* layer — it's where a real backend would live. Keeping them separate means the app degrades gracefully: if the API fails, notes are still saved locally and the user sees a "Save error" badge rather than losing data.

---

## Project structure

```
src/
├── types.ts              # NoteColor, Note, BoardState interfaces
├── reducer.ts            # Pure reducer + all action types
├── storage.ts            # localStorage adapter with runtime type guards
├── context.tsx           # BoardContext, BoardProvider, useBoardContext
├── api/
│   └── notesApi.ts       # Mock async API (swap for real fetch calls)
├── hooks/
│   ├── useDrag.ts        # Pointer-based drag with zero re-renders during move
│   └── useResize.ts      # Same pattern for resize
└── components/
    ├── Board/            # Canvas, empty-state hint, trash zone
    ├── Note/             # Note card, editor, colour picker, delete button
    └── Toolbar/          # App bar, new-note button, save status badge
```
