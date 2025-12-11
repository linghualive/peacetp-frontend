"use client";

import { useEffect, useState } from "react";

const DEFAULT_MEDIA_QUERY = "(max-width: 768px)";

export function useIsMobile(query: string = DEFAULT_MEDIA_QUERY) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return isMobile;
}
