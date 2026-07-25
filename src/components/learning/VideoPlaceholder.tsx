"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VideoPlaceholderProps = {
  transcript: string;
  markers: Array<{ id: string; atSeconds: number; label: string }>;
  initialPosition?: number;
  onPosition: (seconds: number) => void;
  onCompleted: () => void;
};

export function VideoPlaceholder({
  transcript,
  markers,
  initialPosition = 0,
  onPosition,
  onCompleted,
}: VideoPlaceholderProps) {
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(initialPosition);
  const duration = Math.max(60, ...markers.map((marker) => marker.atSeconds + 20));
  const timerRef = useRef<number | null>(null);
  const onPositionRef = useRef(onPosition);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onPositionRef.current = onPosition;
    onCompletedRef.current = onCompleted;
  }, [onPosition, onCompleted]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setSeconds((current) => {
        const next = Math.min(duration, current + 1);
        onPositionRef.current(next);
        if (next >= duration) {
          setPlaying(false);
          onCompletedRef.current();
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing, duration]);

  const activeMarker = useMemo(() => {
    const eligible = markers.filter((marker) => marker.atSeconds <= seconds);
    return eligible[eligible.length - 1] ?? null;
  }, [markers, seconds]);

  return (
    <section className="learn-video" aria-label="Lesson media">
      <div className="learn-video__stage">
        <p className="learn-video__label">Placeholder media (no autoplay)</p>
        <p className="learn-video__clock">
          {formatTime(seconds)} / {formatTime(duration)}
        </p>
        <div className="learn-video__controls">
          <button type="button" onClick={() => setPlaying((value) => !value)}>
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSeconds(0);
              onPosition(0);
              setPlaying(false);
            }}
          >
            Restart
          </button>
        </div>
        <div className="learn-video__progress" aria-hidden>
          <div style={{ width: `${(seconds / duration) * 100}%` }} />
        </div>
        {activeMarker ? (
          <p className="learn-video__marker">Marker: {activeMarker.label}</p>
        ) : null}
      </div>
      <div className="learn-video__transcript">
        <h3>Transcript</h3>
        <p>{transcript}</p>
        <ul>
          {markers.map((marker) => (
            <li key={marker.id}>
              <button
                type="button"
                onClick={() => {
                  setSeconds(marker.atSeconds);
                  onPosition(marker.atSeconds);
                }}
              >
                {formatTime(marker.atSeconds)} — {marker.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function formatTime(total: number): string {
  const minutes = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
