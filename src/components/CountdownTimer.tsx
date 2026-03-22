"use client";

import { useState, useEffect } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function calcTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer({
  targetDate,
  label,
}: {
  targetDate: string;
  label?: string;
}) {
  const target = new Date(targetDate);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calcTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(calcTimeLeft(target));
    }, 1000);
    return () => clearInterval(id);
  }, [target.getTime()]);

  const units: { key: keyof TimeLeft; label: string }[] = [
    { key: "days", label: "Days" },
    { key: "hours", label: "Hours" },
    { key: "minutes", label: "Min" },
    { key: "seconds", label: "Sec" },
  ];

  return (
    <div className="bg-white rounded-xl border border-border p-6 text-center">
      {label && (
        <p className="typo-body text-muted-foreground mb-4">{label}</p>
      )}
      {timeLeft ? (
        <div className="flex justify-center gap-4 md:gap-6">
          {units.map(({ key, label: unitLabel }) => (
            <div key={key} className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-bold text-foreground tabular-nums">
                {String(timeLeft[key]).padStart(2, "0")}
              </span>
              <span className="typo-meta mt-1">{unitLabel}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xl font-semibold text-muted-foreground">Expired</p>
      )}
    </div>
  );
}
