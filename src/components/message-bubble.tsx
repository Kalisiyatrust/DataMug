"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/types";
import { User, Bot } from "lucide-react";

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: isUser
            ? "var(--color-accent)"
            : "var(--color-surface-hover)",
          color: isUser ? "white" : "var(--color-text-secondary)",
        }}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Content */}
      <div
        className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Image preview */}
        {message.image && (
          <div
            className="rounded-xl overflow-hidden border max-w-xs"
            style={{ borderColor: "var(--color-border)" }}
          >
            <img
              src={message.image}
              alt="Uploaded"
              className="max-w-full h-auto max-h-64 object-contain"
            />
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <div
            className="rounded-xl px-4 py-2.5 text-sm"
            style={{
              background: isUser
                ? "var(--color-accent)"
                : "var(--color-surface)",
              color: isUser ? "white" : "var(--color-text)",
              border: isUser ? "none" : `1px solid var(--color-border)`,
            }}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
                {isStreaming && (
                  <span
                    className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm"
                    style={{ background: "var(--color-accent)" }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span
          className="text-xs px-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
