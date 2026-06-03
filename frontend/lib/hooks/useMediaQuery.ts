// useMediaQuery / useIsMobile — drives responsive behavior (NFR-RESP-*, COMPONENT_TREE §5).
// Mobile breakpoint is <768px: sidebar becomes an overlay drawer and the AI review diff collapses
// to tabs (NFR-RESP-04), the selection toolbar repositions above the keyboard (REQ-TBAR-05).
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
