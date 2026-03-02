"use client";

import { Check, CheckCheck, Clock, Bot } from "lucide-react";

export type MessageDirection = "inbound" | "outbound" | "ai";
export type MessageStatus = "sent" | "delivered" | "read" | "pending";

interface MessageBubbleProps {
  direction: MessageDirection;
  content: string;
  timestamp: string;
  status?: MessageStatus;
  senderName?: string;
}

function StatusIcon({ status }: { status: MessageStatus }) {
  if (status === "pending") return <Clock size={12} className="text-stone-400" />;
  if (status === "sent") return <Check size={12} className="text-stone-400" />;
  if (status === "delivered") return <CheckCheck size={12} className="text-stone-400" />;
  if (status === "read") return <CheckCheck size={12} className="text-blue-500" />;
  return null;
}

export function MessageBubble({
  direction,
  content,
  timestamp,
  status = "delivered",
  senderName,
}: MessageBubbleProps) {
  const isOutbound = direction === "outbound";
  const isAI = direction === "ai";

  return (
    <div
      className={`flex items-end gap-2 mb-1.5 ${
        isOutbound || isAI ? "justify-end" : "justify-start"
      }`}
    >
      {/* Inbound avatar placeholder */}
      {direction === "inbound" && (
        <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex-shrink-0 flex items-center justify-center text-xs font-medium text-stone-500 dark:text-stone-400">
          {senderName?.[0] ?? "?"}
        </div>
      )}

      <div
        className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-3.5 py-2.5 relative ${
          isAI
            ? "rounded-br-sm bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800"
            : isOutbound
            ? "rounded-br-sm bg-green-500 dark:bg-green-600 text-white"
            : "rounded-bl-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
        }`}
      >
        {isAI && (
          <div className="flex items-center gap-1 mb-1">
            <Bot size={11} className="text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
              AI Suggestion
            </span>
          </div>
        )}
        <p
          className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isOutbound
              ? "text-white"
              : isAI
              ? "text-stone-800 dark:text-stone-100"
              : "text-stone-800 dark:text-stone-100"
          }`}
        >
          {content}
        </p>
        <div
          className={`flex items-center gap-1 mt-1 ${
            isOutbound || isAI ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-xs ${
              isOutbound
                ? "text-green-100"
                : "text-stone-400 dark:text-stone-500"
            }`}
          >
            {timestamp}
          </span>
          {(isOutbound || isAI) && <StatusIcon status={status} />}
        </div>
      </div>

      {/* Outbound avatar placeholder */}
      {(isOutbound || isAI) && (
        <div
          className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium ${
            isAI
              ? "bg-violet-200 dark:bg-violet-800 text-violet-600 dark:text-violet-300"
              : "bg-green-600 text-white"
          }`}
        >
          {isAI ? <Bot size={13} /> : "Me"}
        </div>
      )}
    </div>
  );
}

export function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-end gap-2 mb-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex-shrink-0 flex items-center justify-center text-xs font-medium text-stone-500">
        {name[0]}
      </div>
      <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-stone-400"
              style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
