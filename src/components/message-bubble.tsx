"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/types";
import { User, Bot, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { ShareMenu } from "./share-menu";
import { LazyImage } from "./optimized-image";

interface Props {
  message: Message;
  isStreaming?: boolean;
  allMessages?: Message[];
  threadTitle?: string;
  model?: string;
}

export function MessageBubble({ message, isStreaming, allMessages, threadTitle, model }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = message.content;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Collect all images for this message (multi-image + legacy single)
  const messageImages: string[] =
    message.images && message.images.length > 0
      ? message.images
      : message.image
        ? [message.image]
        : [];

  return (
    <div
      className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
        style={{
          background: isUser
            ? "var(--color-accent)"
            : "var(--color-surface-hover)",
          color: isUser ? "white" : "var(--color-text-secondary)",
        }}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Content */}
      <div
        className={`flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Image preview(s) */}
        {messageImages.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${messageImages.length === 1 ? "" : ""}`}>
            {messageImages.map((img, idx) => (
              <div key={idx} className="relative">
                <button
                  onClick={() => setImageExpanded(!imageExpanded)}
                  className="rounded-xl overflow-hidden border cursor-pointer transition-all duration-300"
                  style={{
                    borderColor: "var(--color-border)",
                    maxWidth: imageExpanded ? "100%" : "200px",
                  }}
                >
                  <LazyImage
                    src={img}
                    alt={`Uploaded ${idx + 1}`}
                    className="w-full h-auto object-contain transition-all duration-300"
                    style={{ maxHeight: imageExpanded ? "500px" : "120px" }}
                  />
                </button>
                {messageImages.length > 1 && (
                  <div
                    className="absolute bottom-2 left-2 text-xs font-medium px-1.5 rounded"
                    style={{
                      background: "rgba(0,0,0,0.55)",
                      color: "white",
                      fontSize: "0.65rem",
                      lineHeight: "1.4",
                    }}
                  >
                    {idx + 1}
                  </div>
                )}
                {idx === messageImages.length - 1 && (
                  <button
                    onClick={() => setImageExpanded(!imageExpanded)}
                    className="absolute bottom-2 right-2 p-1 rounded-md cursor-pointer"
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      color: "white",
                    }}
                  >
                    {imageExpanded ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <div className="relative group/msg">
            <div
              className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
              style={{
                background: isUser
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
                color: isUser ? "white" : "var(--color-text)",
                border: isUser
                  ? "none"
                  : `1px solid var(--color-border)`,
              }}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Custom code block with copy button
                      code({ className, children, ...props }) {
                        const isInline = !className;
                        if (isInline) {
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                        return <CodeBlock className={className}>{children}</CodeBlock>;
                      },
                      // Links open in new tab
                      a({ children, href, ...props }) {
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--color-accent)" }}
                            {...props}
                          >
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  {isStreaming && <StreamingCursor />}
                </div>
              )}
            </div>

            {/* Action buttons for assistant messages */}
            {!isUser && !isStreaming && (
              <div className="absolute -bottom-6 left-2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer"
                  style={{
                    background: "var(--color-surface-hover)",
                    color: "var(--color-text-secondary)",
                  }}
                  title="Copy response"
                >
                  {copied ? (
                    <>
                      <Check size={10} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={10} />
                      Copy
                    </>
                  )}
                </button>
                <ShareMenu
                  message={message}
                  allMessages={allMessages || []}
                  threadTitle={threadTitle}
                  model={model}
                />
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span
          className="text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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

// Streaming cursor component
function StreamingCursor() {
  return (
    <span className="inline-flex items-center ml-0.5">
      <span
        className="w-2 h-4 rounded-sm animate-blink"
        style={{ background: "var(--color-accent)" }}
      />
    </span>
  );
}

// Code block with copy button
function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace("language-", "") || "";
  const code = String(children).replace(/\n$/, "");

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group/code my-2">
      {/* Language label + copy button */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded-t-lg text-xs"
        style={{
          background: "var(--color-surface-hover)",
          color: "var(--color-text-secondary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span className="font-mono">{lang || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {copied ? (
            <>
              <Check size={11} />
              Copied
            </>
          ) : (
            <>
              <Copy size={11} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre
        className="!rounded-t-none !mt-0 overflow-x-auto"
        style={{
          background: "var(--color-surface-hover)",
        }}
      >
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}
