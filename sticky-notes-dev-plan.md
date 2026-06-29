# Sticky Notes — Incremental Development Plan

Assessment: Front-end Developer (TypeScript)  
Stack: React + TypeScript, Vite, CSS Modules — no UI libraries  
Features targeted: All 4 core + bonuses I, II, III, IV, V  

---

## Architecture Summary (submit this with your code)

The application is structured around a single `BoardContext` that holds an array of `Note` records and exposes a typed `dispatch` function via `useReducer`. All note state mutations — create, move, resize, delete, reorder, recolor, and edit text — flow through one reducer, making state transitions predictable and easy to trace. Persistence is handled by a thin `storage` module that serialises state to `localStorage` on every dispatch and rehydrates on boot.

Drag and resize interactions are implemented as two reusable hooks — `useDrag` and `useResize` — that track pointer events on `document` during an active gesture. This keeps raw DOM event handling out of components and avoids the pitfalls of browser native drag-and-drop (ghost images, restricted data transfer). The trash zone is a fixed overlay element; during a drag the hook computes overlap with the zone's bounding rect and signals deletion when the pointer is released above it.

Components are kept deliberately thin: `Board` renders the canvas and toolbar, `Note` composes the header, body, and resize handle, and `Toolbar` owns the "new note" affordance. There are no third-party component libraries; all interactive chrome (buttons, colour swatches, contenteditable area) is hand-rolled so reviewers can assess design judgment directly.

---

## Project Structure

```
sticky-notes/
├── src/
│   ├── types.ts              # shared interfaces
│   ├── reducer.ts            # pure state reducer
│   ├── storage.ts            # localStorage adapter
│   ├── context.tsx           # BoardContext + provider
│   ├── hooks/
│   │   ├── useDrag.ts
│   │   └── useResize.ts
│   ├── components/
│   │   ├── Board/
│   │   │   ├── Board.tsx
│   │   │   └── Board.module.css
│   │   ├── Note/
│   │   │   ├── Note.tsx
│   │   │   └── Note.module.css
│   │   └── Toolbar/
│   │       ├── Toolbar.tsx
│   │       └── Toolbar.module.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## Development Phases

Each phase is a self-contained prompt. Feed them to your AI assistant one at a time. Do not move to the next phase until the current one compiles and runs correctly.

---

### Phase 1 — Project Scaffold

**Goal:** Working Vite + React + TypeScript repo, no features yet.

```
Scaffold a new Vite project called "sticky-notes" using the react-ts template.

After scaffolding, do the following:
1. Remove all boilerplate files: App.css, assets/, the default App.tsx content.
2. Set up tsconfig.json with strict mode, paths alias "@" → "./src".
3. Update vite.config.ts to resolve the "@" alias.
4. In index.html set the page title to "Sticky Notes".
5. Create an empty src/App.tsx that renders <div id="app" /> and a src/main.tsx
   that mounts it.
6. Confirm `npm run dev` starts without errors.

Do not add any feature code yet.
```

---

### Phase 2 — Types & Reducer

**Goal:** Define the data model and all state transitions before writing any UI.

```
We're building a sticky notes app (React + TypeScript, no UI libraries).

Create src/types.ts with these exported interfaces:

  interface NoteColor {
    bg: string;   // CSS colour string for note body
    header: string; // slightly darker shade for the header bar
  }

  interface Note {
    id: string;
    x: number;       // left position in px
    y: number;       // top position in px
    width: number;   // in px, min 160
    height: number;  // in px, min 120
    text: string;
    color: NoteColor;
    zIndex: number;
  }

  interface BoardState {
    notes: Note[];
    maxZ: number;   // tracks highest zIndex assigned so far
    apiStatus: 'idle' | 'loading' | 'error';
  }

Create src/reducer.ts with a typed reducer for these action types:

  | { type: 'ADD_NOTE'; payload: { x: number; y: number } }
  | { type: 'MOVE_NOTE'; payload: { id: string; x: number; y: number } }
  | { type: 'RESIZE_NOTE'; payload: { id: string; width: number; height: number } }
  | { type: 'DELETE_NOTE'; payload: { id: string } }
  | { type: 'EDIT_TEXT'; payload: { id: string; text: string } }
  | { type: 'BRING_TO_FRONT'; payload: { id: string } }
  | { type: 'SET_COLOR'; payload: { id: string; color: NoteColor } }
  | { type: 'SET_API_STATUS'; payload: 'idle' | 'loading' | 'error' }
  | { type: 'LOAD_STATE'; payload: BoardState }

Rules:
- ADD_NOTE picks a random color from a COLORS constant (define 5 pastel options
  with matching header shades), places the note at (x, y), default 200×160,
  assigns zIndex = maxZ + 1, increments maxZ.
- MOVE_NOTE clamps so the note can't go below y=40 (toolbar height).
- RESIZE_NOTE enforces min width 160, min height 120.
- BRING_TO_FRONT assigns zIndex = maxZ + 1, increments maxZ.
- LOAD_STATE replaces entire state (used by localStorage restore).
- All other actions return a new state object — no mutation.

Export the reducer and an initialState constant ({ notes: [], maxZ: 0, apiStatus: 'idle' }).
No React code in this file.
```

---

### Phase 3 — Context & Storage

**Goal:** Wire state into React; add persistence.

```
We have src/types.ts and src/reducer.ts from the previous step.

1. Create src/storage.ts:
   - Export function saveState(state: BoardState): void
     → JSON.stringify to localStorage key "sticky-notes-state"
   - Export function loadState(): BoardState | null
     → parse from localStorage, return null on any error
   - Keep this module dependency-free (no React imports).

2. Create src/context.tsx:
   - Create BoardContext with value type:
       { state: BoardState; dispatch: React.Dispatch<Action> }
   - Create BoardProvider component:
     - Initialises useReducer with reducer + initialState
     - On mount, calls loadState(); if non-null dispatches LOAD_STATE
     - After every dispatch, calls saveState(state) in a useEffect
       with [state] as dependency
     - Provides context value to children
   - Export useBoardContext() custom hook that throws if used outside provider

3. Update src/App.tsx to wrap children in <BoardProvider> (no children yet,
   just the provider wrapping an empty fragment).

TypeScript: every export must be fully typed, no `any`.
```

---

### Phase 4 — Board Canvas & Toolbar (Create Note)

**Goal:** Clicking anywhere on the board canvas places a new note at that exact position. Toolbar button is a secondary affordance for keyboard-centric users.

```
We have context/reducer/storage set up. Now build the visible shell.

1. Create src/components/Toolbar/Toolbar.tsx + Toolbar.module.css
   - Fixed bar at top, full width, height 40px, background #2b2b2b.
   - One button: "+ New Note"
   - Clicking it dispatches ADD_NOTE at position (80, 80) — this is a
     fallback affordance only. The primary creation method is board click (see below).
   - Style: no external libraries. Button is a plain <button> element,
     white text, transparent background, border 1px solid #666,
     hover lightens slightly. Use CSS custom properties for colours.

2. Create src/components/Board/Board.tsx + Board.module.css
   - Full viewport minus 40px top (the toolbar).
   - Overflow hidden, position relative, background #f0ece4 (cork texture
     approximated with a subtle CSS radial-gradient or solid colour).
   - Renders <Toolbar /> above itself.
   - PRIMARY NOTE CREATION: add an onClick handler to the board div.
     On click, if e.target === e.currentTarget (i.e. the click was on
     the board itself, not on a child note), dispatch ADD_NOTE with:
       x: e.clientX - 100   (centre the 200px-wide note on the click point)
       y: e.clientY - 40 - 80  (subtract toolbar height + half note height)
     Clamp x and y so the note cannot be placed partially off-screen.
   - Maps state.notes → <Note /> (not implemented yet — just render null
     per note as a placeholder).
   - Add a subtle hover cursor hint: cursor: crosshair on the board div
     so users understand the canvas is clickable.

3. Update App.tsx:
   - Render <Board /> inside <BoardProvider>.

At this point "npm run dev" should show the toolbar and the board.
Clicking on the board canvas should write to localStorage (verify in DevTools).
Clicking the toolbar button also works as a fallback.
No note cards visible yet — that's next.

IMPORTANT: This satisfies the assessment requirement "Create a new note at
the specified position" — the position is specified by where the user clicks.
```

---

### Phase 5 — Note Card (display only)

**Goal:** Notes render at correct position/size/color with correct z-index.

```
Build the Note component — display only, no interaction yet.

Create src/components/Note/Note.tsx + Note.module.css.

Props:  note: Note  (the full Note interface from types.ts)

Structure:
  <div className={styles.note}>          ← outer: positioned, sized, colored
    <div className={styles.header}>      ← drag handle area (inactive for now)
      <span className={styles.title}>Sticky Note</span>
    </div>
    <div className={styles.body}>
      <p>{note.text || ''}</p>           ← text display only for now
    </div>
    <div className={styles.resizeHandle} />   ← bottom-right corner (inactive)
  </div>

CSS rules (in Note.module.css):
  .note → position: absolute; border-radius: 3px; box-shadow: 2px 3px 8px rgba(0,0,0,.25);
          display: flex; flex-direction: column; user-select: none;
          background comes from inline style (note.color.bg)
  .header → height: 28px; background from inline style (note.color.header);
             display: flex; align-items: center; padding: 0 8px; cursor: grab;
             border-radius: 3px 3px 0 0;
  .body → flex: 1; padding: 8px; overflow: hidden;
  .resizeHandle → position: absolute; bottom: 0; right: 0; width: 14px; height: 14px;
                  cursor: nw-resize; background: rgba(0,0,0,.12); border-radius: 0 0 3px 0;

Apply position (left, top), size (width, height), and zIndex as inline styles.

Update Board.tsx to render <Note key={note.id} note={note} /> instead of null.

After this phase: clicking on the board canvas should produce visible coloured cards
at the exact position you clicked.
```

---

### Phase 6 — Drag to Move

**Goal:** Dragging the note header moves the note; dispatcher called only on release.

```
Implement note dragging via a custom hook — no native HTML drag API.

Create src/hooks/useDrag.ts:

  interface DragOptions {
    onMove: (x: number, y: number) => void;   // called on pointermove
    onEnd: (x: number, y: number) => void;    // called on pointerup
  }

  export function useDrag(options: DragOptions) {
    // Returns { startDrag: (e: React.PointerEvent) => void }
    // On startDrag: record offset between pointer and note origin,
    //   attach pointermove + pointerup listeners to window,
    //   call e.currentTarget.setPointerCapture(e.pointerId) to keep events flowing
    //   even if pointer leaves the element.
    // On pointermove: compute new (x, y) = pointer - offset, call onMove.
    // On pointerup: call onEnd, remove listeners.
    // Use useRef to store mutable drag state — no setState during drag
    //   (avoids re-renders on every pixel).
    // Cleanup: return cleanup fn in case component unmounts mid-drag.
  }

Update Note.tsx:
  - Handle dispatch internally using useBoardContext().
  - Attach useDrag to the .header div's onPointerDown.
  - During drag, update a local useRef position (not useState) and apply it
    as a CSS transform: translate(dx, dy) on the .note element for visual feedback.
    On drag end, dispatch MOVE_NOTE with the final position and reset the transform.
  - This approach keeps React renders to a minimum during fast mouse movement.

After this phase: you should be able to drag notes around the board smoothly.
Releasing drops them in place. localStorage updates on release.
```

---

### Phase 7 — Resize by Dragging

**Goal:** Dragging the bottom-right handle resizes the note.

```
Add resize interaction using a similar pattern to useDrag.

Create src/hooks/useResize.ts:

  interface ResizeOptions {
    minWidth: number;
    minHeight: number;
    onResize: (width: number, height: number) => void;  // called during drag
    onEnd: (width: number, height: number) => void;     // dispatch happens here
  }

  export function useResize(initialWidth: number, initialHeight: number, options: ResizeOptions) {
    // Returns { startResize: (e: React.PointerEvent) => void }
    // On startResize: record pointer start position + current size.
    // On pointermove: newWidth = initialWidth + (e.clientX - startX),
    //                 newHeight = initialHeight + (e.clientY - startY),
    //   clamp to minWidth/minHeight, call onResize.
    // On pointerup: call onEnd, remove listeners.
    // Same useRef-for-mutable-state pattern as useDrag.
  }

Update Note.tsx:
  - Hold local width/height in useRef (mirrors note.width/height, updated on resize).
  - Attach useResize to the .resizeHandle div's onPointerDown.
  - During resize, apply width/height directly to the DOM node via a ref
    (element.style.width = ...) rather than setState to avoid per-pixel renders.
  - On resize end, dispatch RESIZE_NOTE with final dimensions.

Also: attach onPointerDown on the entire .note div to dispatch BRING_TO_FRONT,
so clicking any note brings it forward.

After this phase: all 4 core features (create, move, resize, bring-to-front) work.
```

---

### Phase 8 — Trash Zone

**Goal:** Dragging a note onto the trash deletes it.

```
Add a trash zone that deletes a note when released over it.

1. Create a TrashZone component (no separate file needed, inline in Board.tsx is fine):
   - A fixed <div> in the bottom-right corner: 80×80px, position fixed,
     background rgba(200,50,50,.15), border 2px dashed #c03030, border-radius 50%.
   - Shows a trash icon (unicode 🗑 or a simple CSS X) and label "Drop to delete".
   - Hidden by default (opacity 0, pointer-events none).
   - Becomes visible (opacity 1) while any note is being dragged.
     Implement this with a React context value isDragging (boolean) or a simple
     CSS class toggled on <body> — your choice.

2. Update useDrag.ts to accept an optional trashRef: RefObject<HTMLElement>.
   - On pointerup: check if pointer is inside trashRef.current.getBoundingClientRect().
   - If yes, call a new onDelete() callback instead of onEnd().

3. Update Note.tsx:
   - Pass the trash zone ref down (via context or prop drilling — context is cleaner).
   - If onDelete fires, dispatch DELETE_NOTE.

4. Visual polish:
   - While dragging, the note gets opacity 0.85.
   - When dragging over the trash zone (check in pointermove), the zone highlights
     (red background, scale up slightly via CSS transition).

After this phase: all assessment requirements are met.
```

---

### Phase 9 — Text Editing (Bonus I)

**Goal:** Double-clicking the note body opens an editable area.

```
Add inline text editing to Note.tsx.

Replace the <p> in .body with a <div contentEditable="true"> (or textarea).
Using contentEditable keeps the layout simple.

  - Add isEditing: boolean state to Note component.
  - On double-click of .body: set isEditing = true, focus the element.
  - contentEditable div: suppress pointer events for drag while editing.
  - On blur: dispatch EDIT_TEXT with the current innerText value,
    set isEditing = false.
  - Prevent header drag from firing when body is double-clicked
    (stop propagation on the body's dblclick handler).
  - CSS: when editing, show a subtle inset box-shadow on the body area.

Note: the div must have suppressContentEditableWarning={true} to silence React.
Do not manage content with React state — read it from the DOM on blur.
This avoids cursor-jump issues with controlled contentEditable.
```

---

### Phase 10 — Color Picker (Bonus IV)

**Goal:** Each note can be recoloured from a small palette.

```
Add a colour picker to the note header.

1. In Note.tsx, add a small row of colour swatches inside the header,
   visible only on hover (CSS: opacity 0 on .header, opacity 1 on .note:hover .header .swatches).

2. Each swatch is a <button> sized 14×14px with border-radius 50%,
   styled with its background colour (from the COLORS constant in reducer.ts).

3. Clicking a swatch dispatches SET_COLOR with the note id and chosen NoteColor.

4. The swatches row should not trigger the drag — add e.stopPropagation()
   on the swatches container's onPointerDown.

Keep the number of DOM nodes minimal: render exactly 5 swatch buttons.
```

---

### Phase 10.5 — Async REST API Mock (Bonus V)

**Goal:** All note mutations go through an async API layer that mimics real network calls.

```
Add a mock REST API module that sits between the UI and state, with simulated
async latency. You are NOT building a server — all data stays in memory inside
the mock. The point is to demonstrate correct async patterns.

1. Create src/api/notesApi.ts:

   // Simulates a 150-250ms network round-trip
   function delay(): Promise<void> {
     return new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));
   }

   // In-memory store — mirrors what the real API would persist server-side
   let serverNotes: Note[] = [];

   export async function apiFetchNotes(): Promise<Note[]> {
     await delay();
     return [...serverNotes];
   }

   export async function apiSaveNote(note: Note): Promise<Note> {
     await delay();
     const idx = serverNotes.findIndex(n => n.id === note.id);
     if (idx >= 0) serverNotes[idx] = note;
     else serverNotes.push(note);
     return { ...note };
   }

   export async function apiDeleteNote(id: string): Promise<void> {
     await delay();
     serverNotes = serverNotes.filter(n => n.id !== id);
   }

   All functions must be fully typed. No `any`.

2. Update BoardProvider in context.tsx:
   - On mount: dispatch SET_API_STATUS 'loading', call apiFetchNotes(),
     on success dispatch LOAD_STATE with the result + SET_API_STATUS 'idle',
     on error dispatch SET_API_STATUS 'error'.
   - After any note mutation (ADD, MOVE, RESIZE, DELETE, EDIT, SET_COLOR):
     fire-and-forget the corresponding API call in a useEffect.
     Do not block the UI — optimistic updates (state updates immediately,
     API call happens in background). Log errors to console only.

3. Add a minimal status indicator to Toolbar.tsx:
   - A small dot (8px circle) that is grey when idle, yellow when loading,
     red when error. No text label needed — just the dot with an aria-label.
   - This makes the async behaviour visible during review.

4. localStorage and the API mock coexist:
   - localStorage is the persistence layer for offline/reload.
   - The API mock is an additional call that happens in parallel.
   - On page load, prefer the API response (it's the "source of truth").
     If the API fails, fall back to localStorage.

This bonus earns points by demonstrating: async/await, optimistic UI,
error handling, separation of API concerns from state management.
```

---

### Phase 11 — Final Polish & Architecture Doc

**Goal:** Production-ready code, no loose ends.

```
Do a final review pass over the entire codebase.

Checklist:
1. TypeScript: zero `any`, no implicit `any`, no unused imports.
   Run `tsc --noEmit` and fix all errors.
2. Remove all console.log statements.
3. Comments: delete any comment that restates the code. Keep only ones
   that explain WHY, not WHAT (e.g., why pointer capture is needed,
   why we skip setState during drag).
4. CSS: ensure no hardcoded colours outside of the COLORS constant and
   CSS custom properties. Board background, toolbar, and shadows use
   variables defined in a :root block in index.css.
   Also enforce minimum resolution in index.css:
     body { min-width: 1024px; min-height: 768px; }
   This satisfies the assessment system requirement explicitly.
5. Accessibility minimum: all interactive elements have either an
   aria-label or visible text. The board root has role="application"
   aria-label="Sticky notes board".
6. README.md:
   - Two sentences on how to run (npm install && npm run dev).
   - The 3-paragraph architecture description (copy from this plan and
     adapt to your actual implementation).
7. Verify in Chrome, Firefox, and Edge that:
   - Notes persist across page reload.
   - Drag, resize, delete, colour change, text edit all work.
   - No console errors at startup or during interaction.
```

---

## Prompt Usage Notes

- Feed each phase prompt verbatim to your AI assistant (Claude, Copilot, etc.)
- After each phase, run `npm run dev` and manually test before proceeding
- If a phase prompt produces broken code, paste the TypeScript compiler error
  back into the same chat thread — do not start a new conversation
- Phases 6 and 7 are the hardest. If you're short on time, implement Phase 7
  (resize) before Phase 8 (trash) — resize scores higher with reviewers
- The `useRef`-for-DOM-mutation pattern in Phases 6 & 7 is intentional:
  it is the correct approach for 60fps drag interactions in React

---

## Submission Checklist

- [ ] `npm install && npm run dev` works from a fresh clone
- [ ] Feature 1: clicking the board canvas creates a note at the click position
- [ ] Feature 2: drag resize handle resizes the note
- [ ] Feature 3: drag note header moves the note
- [ ] Feature 4: drag note over trash zone deletes it
- [ ] Bonus I: double-click body to edit text
- [ ] Bonus II: clicking a note brings it to front
- [ ] Bonus III: notes persist across page reload (localStorage)
- [ ] Bonus IV: colour swatches on each note
- [ ] Bonus V: async API mock fires on every mutation, status dot visible in toolbar
- [ ] `body { min-width: 1024px; min-height: 768px }` present in index.css
- [ ] Zero TypeScript errors (`tsc --noEmit` passes)
- [ ] Architecture description included (README.md or ARCHITECTURE.md)
- [ ] Comments are sparse and meaningful — not auto-generated noise
