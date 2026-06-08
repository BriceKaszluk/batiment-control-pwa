"use client";

import { useEffect, useState } from "react";

export function useLocalDayKey() {
  const [localDayKey, setLocalDayKey] = useState(() =>
    formatLocalDayKey(new Date()),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLocalDayKey(formatLocalDayKey(new Date()));
    }, getMsUntilNextLocalDay());

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [localDayKey]);

  return localDayKey;
}

function getMsUntilNextLocalDay() {
  const now = new Date();
  const nextLocalDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  return Math.max(1_000, nextLocalDay.getTime() - now.getTime());
}

function formatLocalDayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
