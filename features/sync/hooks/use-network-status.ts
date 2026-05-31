"use client";

import { useEffect, useState } from "react";

export type NetworkStatus = "offline" | "online";

function readNetworkStatus(): NetworkStatus {
  if (typeof navigator === "undefined") {
    return "online";
  }

  return navigator.onLine ? "online" : "offline";
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>("online");

  useEffect(() => {
    const updateStatus = () => {
      setStatus(readNetworkStatus());
    };

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return status;
}
