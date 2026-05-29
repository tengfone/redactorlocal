import { useEffect, useState } from "react";

/**
 * Tracks browser online/offline status. Always returns `true` for the initial
 * (server + first client) render so SSR markup matches the client and React
 * does not throw a hydration mismatch. The real status is applied after mount.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
