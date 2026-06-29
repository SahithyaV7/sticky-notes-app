# Sticky Notes

A production-quality sticky notes app built with React, TypeScript, and Vite. No UI component libraries — all interactive chrome is hand-rolled.

## Running the app

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Requires Node 20+.

## Features

- **Create** — click anywhere on the board canvas to place a note at that position; "+ New Note" button is a keyboard-accessible fallback
- **Move** — drag the note header to reposition; drops are committed on pointer release
- **Resize** — drag the bottom-right handle to resize; enforces a 160×120 minimum
- **Delete** — drag any note onto the trash zone that appears in the bottom-right corner
- **Edit** — double-click the note body to enter inline text editing mode (contentEditable)
- **Recolor** — hover a note to reveal five pastel color swatches; clicking one changes the note's color
- **Bring to front** — clicking any note brings it above all others (z-index ordering)
- **Persistence** — notes survive page reload via localStorage
- **Async API** — all mutations are fire-and-forget'd to a mock API with 150–250ms simulated latency; a status dot in the toolbar reflects idle / loading / error

## Architecture

The application is structured around a single `BoardContext` that holds an array of `Note` records and exposes a typed `dispatch` function via `useReducer`. All note state mutations — create, move, resize, delete, reorder, recolor, and edit text — flow through one pure reducer with discriminated union action types, making state transitions predictable and easy to trace. Persistence is handled by a thin `storage` module that validates the localStorage payload with runtime type guards before rehydrating; `apiStatus` is explicitly excluded from serialisation since it is always transient. Context initialisation uses the lazy `useReducer` initializer (`useReducer(reducer, undefined, init)`) to avoid a save-before-load race on first render.

Drag and resize interactions are implemented as two reusable hooks — `useDrag` and `useResize` — that track pointer events on `window` during an active gesture using `setPointerCapture` for reliable cross-boundary tracking. Both hooks store mutable gesture state in `useRef` (not `useState`) so no React re-renders fire during a drag; the component applies position and size changes directly to the DOM node via `ref.current.style.*`, then dispatches the final value on `pointerup`. An `optionsRef` pattern (`optionsRef.current = options` on every render) ensures pointer event listeners always close over current callbacks without needing to be re-attached. The trash zone is a fixed overlay element; during a drag, `body.is-dragging` is toggled via a CSS class (zero React re-renders), and a `data-drag-over` attribute drives the highlight animation in CSS.

The async API layer (`src/api/notesApi.ts`) sits in front of state as an in-memory mock with simulated latency. All UI updates are optimistic — state changes immediately, then the corresponding `apiSaveNote` or `apiDeleteNote` call fires and-forget in a `useEffect` that diffs `state.notes` against a `prevNotesRef`. A `lastActionRef`-wrapped dispatch tracks the most recent action type so the sync effect can skip internal actions (`LOAD_STATE`, `SET_API_STATUS`) that originate from the API rather than the user. On mount the provider fetches from the API and treats it as source of truth, falling back to localStorage on failure.
