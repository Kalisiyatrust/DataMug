"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * LazyImage
 *
 * Defers loading an image until it is near the viewport (within 200 px) using
 * IntersectionObserver. This prevents the browser from fetching every base64
 * data URL for messages that are scrolled far above the viewport — important
 * for long conversations where images can total tens of megabytes.
 *
 * Render flow:
 *  1. Placeholder shown until the element scrolls within rootMargin.
 *  2. Once visible, the <img> tag is inserted (triggering the actual decode).
 *  3. A fade-in transition masks the brief decode time.
 *  4. The skeleton placeholder is removed once onLoad fires.
 */
export function LazyImage({ src, alt, className, style, onClick }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style} onClick={onClick}>
      {isVisible ? (
        <>
          {!isLoaded && (
            <div
              className="animate-pulse rounded-lg"
              style={{
                background: "var(--color-surface-hover)",
                width: "200px",
                height: "120px",
              }}
            />
          )}
          <img
            src={src}
            alt={alt}
            className={`${className || ""} transition-opacity duration-300 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={isLoaded ? style : { ...style, position: "absolute" }}
            onLoad={() => setIsLoaded(true)}
          />
        </>
      ) : (
        /* Placeholder keeps layout stable before the image enters the viewport */
        <div
          className="rounded-lg"
          style={{
            background: "var(--color-surface-hover)",
            width: "200px",
            height: "120px",
          }}
        />
      )}
    </div>
  );
}
