import { createContext, useContext, useRef, ReactNode, RefObject } from 'react';

const TrashZoneContext = createContext<RefObject<HTMLDivElement> | null>(null);

export function TrashZoneProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return <TrashZoneContext.Provider value={ref}>{children}</TrashZoneContext.Provider>;
}

export function useTrashZone(): RefObject<HTMLDivElement> {
  const ref = useContext(TrashZoneContext);
  if (ref === null) throw new Error('useTrashZone must be used within TrashZoneProvider');
  return ref;
}
