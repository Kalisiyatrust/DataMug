import { useMemo, useState, useCallback } from "react";
import type { Message } from "@/types";

const VISIBLE_BUFFER = 30; // Show last 30 messages by default

interface VirtualizedMessages {
  /** The slice of messages to actually render. */
  visibleMessages: Message[];
  /** Whether there are messages before the visible window. */
  hasEarlier: boolean;
  /** Total message count across all windows. */
  totalCount: number;
  /** How many messages are hidden before the visible window. */
  hiddenCount: number;
  /** Expand the visible window by another VISIBLE_BUFFER messages. */
  loadEarlier: () => void;
}

/**
 * useVirtualizedMessages
 *
 * Returns a windowed view of messages for performance.
 * For short conversations (≤ VISIBLE_BUFFER messages) it is a no-op and
 * returns all messages unchanged.
 *
 * For long conversations it shows only the latest VISIBLE_BUFFER messages
 * and exposes a `loadEarlier` callback to progressively reveal older ones —
 * avoiding the cost of mounting hundreds of MessageBubble components at once.
 *
 * @example
 * const { visibleMessages, hasEarlier, hiddenCount, loadEarlier } =
 *   useVirtualizedMessages(messages);
 */
export function useVirtualizedMessages(messages: Message[]): VirtualizedMessages {
  // windowSize controls how far back we render. Starts at VISIBLE_BUFFER and
  // grows each time the user clicks "Load earlier messages".
  const [windowSize, setWindowSize] = useState(VISIBLE_BUFFER);

  const loadEarlier = useCallback(() => {
    setWindowSize((prev) => prev + VISIBLE_BUFFER);
  }, []);

  return useMemo(() => {
    const totalCount = messages.length;

    if (totalCount <= windowSize) {
      return {
        visibleMessages: messages,
        hasEarlier: false,
        totalCount,
        hiddenCount: 0,
        loadEarlier,
      };
    }

    const visibleMessages = messages.slice(-windowSize);
    const hiddenCount = totalCount - windowSize;

    return {
      visibleMessages,
      hasEarlier: true,
      totalCount,
      hiddenCount,
      loadEarlier,
    };
  }, [messages, windowSize, loadEarlier]);
}
