"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Message, OllamaModel } from "@/types";
import { ANALYSIS_PRESETS, generateId } from "@/lib/constants";
import {
  getThreads,
  saveThread,
  deleteThread,
  createThread,
  generateTitle,
  migrateFromLegacy,
  togglePin,
  type ChatThread,
} from "@/lib/threads";
import { processImage } from "@/lib/image-utils";
import { addToGallery } from "@/lib/gallery";
import { trackAnalysis } from "@/lib/analytics";
import { loadSettings } from "@/components/settings-panel";
import { ImageUpload } from "./image-upload";
import { MultiImageUpload } from "./multi-image-upload";
import { MessageBubble } from "./message-bubble";
import { ModelSelector } from "./model-selector";
import { PresetButtons } from "./preset-buttons";
import { ConnectionBanner } from "./connection-banner";
import { EmptyState } from "./empty-state";
import { TypingIndicator } from "./typing-indicator";
import { ThreadSidebar } from "./thread-sidebar";
import { ThemeToggle } from "./theme-toggle";
import { TemplateLibrary } from "./template-library";
import { ImageGallery } from "./image-gallery";
import { BatchAnalysis } from "./batch-analysis";
import { CommandPalette, type CommandAction } from "./command-palette";
import { SettingsPanel } from "./settings-panel";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { ErrorBoundary } from "./error-boundary";
import { useVirtualizedMessages } from "@/hooks/use-virtualized-messages";
import { COMPARISON_PRESETS } from "@/lib/comparison-presets";
import {
  Send,
  ImagePlus,
  StopCircle,
  Coffee,
  Menu,
  Images,
  Bookmark,
  Image as ImageIcon,
  FileImage,
  Settings,
  BarChart3,
} from "lucide-react";

export function ChatInterface() {
  // Thread state
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [multiImages, setMultiImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [multiImageMode, setMultiImageMode] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Track the last image sent for multi-turn context
  const [lastImage, setLastImage] = useState<string | null>(null);

  // Week 3: Modal states
  const [showTemplates, setShowTemplates] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Day 11: Virtualized messages for performance
  const { visibleMessages, hasEarlier, hiddenCount, loadEarlier } =
    useVirtualizedMessages(messages);

  // Initialize: load threads, migrate legacy data
  useEffect(() => {
    const migrated = migrateFromLegacy();
    const loaded = getThreads();
    setThreads(loaded);

    if (migrated) {
      setActiveThreadId(migrated.id);
      setMessages(migrated.messages);
    } else if (loaded.length > 0) {
      setActiveThreadId(loaded[0].id);
      setMessages(loaded[0].messages);
    }

    // Load default model from settings
    const settings = loadSettings();
    if (settings.defaultModel) {
      setSelectedModel(settings.defaultModel);
    }
  }, []);

  // Load models
  useEffect(() => {
    fetchModels();
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Save current thread whenever messages change
  useEffect(() => {
    if (activeThreadId && messages.length > 0) {
      const thread = threads.find((t) => t.id === activeThreadId);
      if (thread) {
        const updated: ChatThread = {
          ...thread,
          messages,
          title:
            thread.title === "New Chat"
              ? generateTitle(messages)
              : thread.title,
          model: selectedModel,
        };
        saveThread(updated);
        setThreads((prev) =>
          prev.map((t) => (t.id === activeThreadId ? updated : t))
        );
      }
    }
  }, [messages]);

  // Track last image for multi-turn follow-ups
  useEffect(() => {
    const lastUserWithImage = [...messages]
      .reverse()
      .find(
        (m) =>
          m.role === "user" && (m.image || (m.images && m.images.length > 0))
      );
    if (lastUserWithImage?.image) {
      setLastImage(lastUserWithImage.image);
    } else if (
      lastUserWithImage?.images &&
      lastUserWithImage.images.length > 0
    ) {
      setLastImage(lastUserWithImage.images[0]);
    }
  }, [messages]);

  // Open sidebar on wider screens
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth >= 768 &&
      threads.length > 1
    ) {
      setSidebarOpen(true);
    }
  }, [threads.length]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (
      sidebarOpen &&
      typeof window !== "undefined" &&
      window.innerWidth < 768
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Listen for compare event from multi-image-upload
  useEffect(() => {
    function handleCompare() {
      const preset = COMPARISON_PRESETS[0];
      if (preset) {
        setInput(preset.prompt);
        inputRef.current?.focus();
      }
    }
    window.addEventListener("datamug:compare", handleCompare);
    return () => window.removeEventListener("datamug:compare", handleCompare);
  }, []);

  // Global keyboard shortcut: Cmd+K for command palette
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Build command palette actions
  const commandActions: CommandAction[] = [
    {
      id: "new-chat",
      label: "New Chat",
      icon: Coffee,
      shortcut: "⌘N",
      action: handleNewThread,
      category: "actions",
    },
    {
      id: "templates",
      label: "Prompt Templates",
      description: "Browse and use prompt templates",
      icon: Bookmark,
      shortcut: "⌘T",
      action: () => setShowTemplates(true),
      category: "actions",
    },
    {
      id: "gallery",
      label: "Image Gallery",
      description: "View analyzed images",
      icon: ImageIcon,
      shortcut: "⌘G",
      action: () => setShowGallery(true),
      category: "navigation",
    },
    {
      id: "batch",
      label: "Batch Analysis",
      description: "Analyze multiple images at once",
      icon: FileImage,
      action: () => setShowBatch(true),
      category: "actions",
    },
    {
      id: "analytics",
      label: "Usage Analytics",
      description: "View usage stats",
      icon: BarChart3,
      action: () => setShowAnalytics(true),
      category: "navigation",
    },
    {
      id: "settings",
      label: "Settings",
      description: "Theme, model defaults, data",
      icon: Settings,
      shortcut: "⌘,",
      action: () => setShowSettings(true),
      category: "settings",
    },
    {
      id: "upload",
      label: "Upload Image",
      shortcut: "⌘⇧V",
      icon: ImagePlus,
      action: () => setShowUpload(true),
      category: "actions",
    },
    {
      id: "multi-image",
      label: "Multi-Image Compare",
      icon: Images,
      action: () => {
        setMultiImageMode(true);
        setShowUpload(false);
        setImage(null);
      },
      category: "actions",
    },
  ];

  async function fetchModels() {
    setConnectionStatus("checking");
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.error) {
        setConnectionError(data.error);
        setConnectionStatus("disconnected");
      } else {
        setModels(data.models || []);
        setConnectionError(null);
        setConnectionStatus("connected");
        if (data.models?.length > 0 && !selectedModel) {
          const visionModel = data.models.find(
            (m: OllamaModel) =>
              m.name.includes("llava") ||
              m.name.includes("vision") ||
              m.name.includes("qwen2.5vl") ||
              m.name.includes("minicpm-v")
          );
          setSelectedModel(visionModel?.id || data.models[0].id);
        }
      }
    } catch {
      setConnectionError(
        "Cannot connect to Ollama. Make sure it is running."
      );
      setConnectionStatus("disconnected");
    }
  }

  function handleNewThread() {
    const thread = createThread(selectedModel);
    saveThread(thread);
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setMessages([]);
    setImage(null);
    setMultiImages([]);
    setLastImage(null);
    setShowUpload(false);
    setMultiImageMode(false);
    inputRef.current?.focus();
  }

  function handleSelectThread(id: string) {
    const thread = threads.find((t) => t.id === id);
    if (thread) {
      setActiveThreadId(id);
      setMessages(thread.messages);
      if (thread.model) setSelectedModel(thread.model);
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
  }

  function handleDeleteThread(id: string) {
    deleteThread(id);
    const remaining = threads.filter((t) => t.id !== id);
    setThreads(remaining);

    if (activeThreadId === id) {
      if (remaining.length > 0) {
        setActiveThreadId(remaining[0].id);
        setMessages(remaining[0].messages);
      } else {
        setActiveThreadId(null);
        setMessages([]);
      }
    }
  }

  function handleRenameThread(id: string, title: string) {
    const thread = threads.find((t) => t.id === id);
    if (thread) {
      const updated = { ...thread, title };
      saveThread(updated);
      setThreads((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  }

  function handleTogglePin(id: string) {
    const updated = togglePin(id);
    if (updated) {
      setThreads(getThreads());
    }
  }

  function handleImportComplete() {
    setThreads(getThreads());
  }

  // Navigate to thread from gallery
  function handleGalleryNavigate(threadId: string) {
    setShowGallery(false);
    handleSelectThread(threadId);
  }

  const handleSubmit = useCallback(
    async (customPrompt?: string) => {
      const messageText = customPrompt || input.trim();
      const hasImages = multiImageMode ? multiImages.length > 0 : !!image;
      if (!messageText && !hasImages) return;
      if (isLoading) return;

      // Auto-create thread if none exists
      let currentThreadId = activeThreadId;
      if (!currentThreadId) {
        const thread = createThread(selectedModel);
        saveThread(thread);
        setThreads((prev) => [thread, ...prev]);
        setActiveThreadId(thread.id);
        currentThreadId = thread.id;
      }

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: messageText || "Analyze this image",
        image: !multiImageMode ? image || undefined : undefined,
        images:
          multiImageMode && multiImages.length > 0 ? multiImages : undefined,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setStreamingContent("");
      setConnectionError(null);

      abortControllerRef.current = new AbortController();

      // Determine which image(s) to send
      const imagesToSend =
        multiImageMode && multiImages.length > 0 ? multiImages : null;
      const singleImageToSend = !multiImageMode
        ? image || (messageText && lastImage ? lastImage : null)
        : null;

      const startTime = Date.now();

      try {
        const settings = loadSettings();
        const res = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageText || "Analyze this image",
            image: singleImageToSend || undefined,
            images: imagesToSend || undefined,
            model: selectedModel || undefined,
            history: messages.slice(-(settings.maxHistoryMessages || 10)),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Request failed with status ${res.status}`
          );
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                }
                if (parsed.error) throw new Error(parsed.error);
              } catch (e) {
                if (
                  e instanceof Error &&
                  !e.message.includes("Unexpected")
                ) {
                  throw e;
                }
              }
            }
          }
        }

        const responseTimeMs = Date.now() - startTime;

        if (fullContent) {
          const assistantMessage: Message = {
            id: generateId(),
            role: "assistant",
            content: fullContent,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Track analytics
          const imageCount = imagesToSend
            ? imagesToSend.length
            : singleImageToSend
              ? 1
              : 0;
          trackAnalysis({
            model: selectedModel || "default",
            responseTimeMs,
            imageCount,
            promptLength: messageText.length,
            responseLength: fullContent.length,
          });

          // Save to gallery if there was an image
          const imgForGallery =
            singleImageToSend || (imagesToSend && imagesToSend[0]);
          const settings2 = loadSettings();
          if (imgForGallery && currentThreadId && settings2.autoSaveGallery) {
            addToGallery({
              imageDataUrl: imgForGallery,
              threadId: currentThreadId,
              messageId: userMessage.id,
              analysisText: fullContent,
              model: selectedModel || "default",
            }).catch(() => {
              // Gallery save failures are non-critical
            });
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          if (streamingContent) {
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: "assistant",
                content: streamingContent + "\n\n---\n_Generation stopped_",
                timestamp: Date.now(),
              },
            ]);
          }
        } else {
          const errMsg =
            error instanceof Error ? error.message : "An error occurred";
          if (
            errMsg.includes("Cannot connect") ||
            errMsg.includes("ECONNREFUSED") ||
            errMsg.includes("fetch failed")
          ) {
            setConnectionError(errMsg);
            setConnectionStatus("disconnected");
          }
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: "assistant",
              content: `**Error:** ${errMsg}\n\nMake sure Ollama is running with a vision model. Try: \`ollama serve\` and \`ollama pull llava:7b\``,
              timestamp: Date.now(),
            },
          ]);
        }
      } finally {
        setIsLoading(false);
        setStreamingContent("");
        setImage(null);
        setMultiImages([]);
        setShowUpload(false);
        setMultiImageMode(false);
        abortControllerRef.current = null;
        inputRef.current?.focus();
      }
    },
    [
      input,
      image,
      multiImages,
      multiImageMode,
      isLoading,
      selectedModel,
      messages,
      streamingContent,
      activeThreadId,
      lastImage,
    ]
  );

  function handleStop() {
    abortControllerRef.current?.abort();
  }

  function handlePresetClick(presetId: string) {
    const preset = ANALYSIS_PRESETS.find((p) => p.id === presetId);
    if (preset) handleSubmit(preset.prompt);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "v") {
      e.preventDefault();
      setShowUpload(!showUpload);
    }
    if (e.key === "Escape" && isLoading) {
      handleStop();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "n") {
      e.preventDefault();
      handleNewThread();
    }
    // Cmd+T for templates
    if ((e.metaKey || e.ctrlKey) && e.key === "t") {
      e.preventDefault();
      setShowTemplates(true);
    }
    // Cmd+G for gallery
    if ((e.metaKey || e.ctrlKey) && e.key === "g") {
      e.preventDefault();
      setShowGallery(true);
    }
    // Cmd+, for settings
    if ((e.metaKey || e.ctrlKey) && e.key === ",") {
      e.preventDefault();
      setShowSettings(true);
    }
  }

  // Global paste
  useEffect(() => {
    function handleGlobalPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            processImage(file).then((dataUrl) => {
              if (multiImageMode) {
                setMultiImages((prev) => [...prev.slice(0, 3), dataUrl]);
              } else {
                setImage(dataUrl);
                setShowUpload(false);
              }
            });
          }
          break;
        }
      }
    }
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [multiImageMode]);

  function handleImageSelect(dataUrl: string) {
    setImage(dataUrl);
    setShowUpload(false);
    inputRef.current?.focus();
  }

  // Get active thread for title
  const activeThread = threads.find((t) => t.id === activeThreadId);

  // Show follow-up context hint
  const hasImageContext =
    !image &&
    multiImages.length === 0 &&
    !!lastImage &&
    messages.length > 0;

  return (
    <ErrorBoundary>
      <div className="flex h-full">
        {/* Mobile sidebar overlay */}
        <div
          className={`sidebar-overlay md:hidden ${sidebarOpen ? "active" : ""}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* Thread Sidebar */}
        <ThreadSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          onDeleteThread={handleDeleteThread}
          onRenameThread={handleRenameThread}
          onTogglePin={handleTogglePin}
          onImportComplete={handleImportComplete}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main chat area */}
        <div className="flex flex-col flex-1 min-w-0 h-full">
          {/* Header */}
          <header
            className="flex items-center justify-between px-4 sm:px-6 py-3 border-b backdrop-blur-sm sticky top-0 z-10"
            style={{
              borderColor: "var(--color-border)",
              background:
                "color-mix(in srgb, var(--color-bg) 85%, transparent)",
            }}
          >
            <div className="flex items-center gap-2.5">
              {/* Hamburger — mobile only */}
              <button
                className="md:hidden p-2 rounded-lg"
                style={{ color: "var(--color-text-secondary)" }}
                onClick={() => setSidebarOpen((prev) => !prev)}
                aria-label="Toggle sidebar"
              >
                <Menu size={18} />
              </button>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-accent)" }}
              >
                <Coffee size={18} color="white" />
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight">
                  DataMug
                </h1>
                <p
                  className="text-xs leading-tight"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Vision AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick action buttons */}
              <button
                onClick={() => setShowTemplates(true)}
                className="p-2 rounded-lg transition-colors cursor-pointer hidden sm:block"
                style={{ color: "var(--color-text-secondary)" }}
                title="Templates (⌘T)"
              >
                <Bookmark size={16} />
              </button>
              <button
                onClick={() => setShowGallery(true)}
                className="p-2 rounded-lg transition-colors cursor-pointer hidden sm:block"
                style={{ color: "var(--color-text-secondary)" }}
                title="Gallery (⌘G)"
              >
                <ImageIcon size={16} />
              </button>
              <button
                onClick={() => setShowBatch(true)}
                className="p-2 rounded-lg transition-colors cursor-pointer hidden sm:block"
                style={{ color: "var(--color-text-secondary)" }}
                title="Batch Analysis"
              >
                <FileImage size={16} />
              </button>
              <button
                onClick={() => setShowAnalytics(true)}
                className="p-2 rounded-lg transition-colors cursor-pointer hidden sm:block"
                style={{ color: "var(--color-text-secondary)" }}
                title="Analytics"
              >
                <BarChart3 size={16} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg transition-colors cursor-pointer hidden sm:block"
                style={{ color: "var(--color-text-secondary)" }}
                title="Settings (⌘,)"
              >
                <Settings size={16} />
              </button>

              <ModelSelector
                models={models}
                selected={selectedModel}
                onChange={setSelectedModel}
                onRefresh={fetchModels}
                connectionStatus={connectionStatus}
              />
              <ThemeToggle />
            </div>
          </header>

          {/* Connection Banner */}
          <ConnectionBanner
            status={connectionStatus}
            error={connectionError}
            onRetry={fetchModels}
          />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth">
            {messages.length === 0 && !isLoading ? (
              <EmptyState
                onPresetClick={(prompt) => {
                  setShowUpload(true);
                  setInput(prompt);
                }}
              />
            ) : (
              <div className="space-y-6">
                {/* Load earlier messages button */}
                {hasEarlier && (
                  <button
                    onClick={loadEarlier}
                    className="w-full text-xs py-2 rounded-lg transition-colors duration-200 cursor-pointer"
                    style={{
                      background: "var(--color-surface-hover)",
                      color: "var(--color-text-secondary)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    Load {hiddenCount} earlier messages
                  </button>
                )}
                {visibleMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    allMessages={messages}
                    threadTitle={activeThread?.title}
                    model={selectedModel}
                  />
                ))}
                {isLoading && streamingContent && (
                  <MessageBubble
                    message={{
                      id: "streaming",
                      role: "assistant",
                      content: streamingContent,
                      timestamp: Date.now(),
                    }}
                    isStreaming
                  />
                )}
                {isLoading && !streamingContent && (
                  <TypingIndicator
                    hasImage={
                      !!image || multiImages.length > 0 || !!lastImage
                    }
                  />
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className="border-t px-4 sm:px-6 py-3 space-y-2"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-bg)",
            }}
          >
            {/* Single image upload */}
            {!multiImageMode && (showUpload || image) && (
              <ImageUpload
                image={image}
                onImageSelect={handleImageSelect}
                onImageRemove={() => setImage(null)}
              />
            )}

            {/* Multi-image upload */}
            {multiImageMode && (
              <MultiImageUpload
                images={multiImages}
                onImagesChange={setMultiImages}
                maxImages={4}
              />
            )}

            {image && !multiImageMode && !isLoading && (
              <PresetButtons onSelect={handlePresetClick} />
            )}

            {/* Follow-up context hint */}
            {hasImageContext && !showUpload && !multiImageMode && (
              <div
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg animate-fadeIn"
                style={{
                  background: "var(--color-accent-light)",
                  color: "var(--color-accent)",
                }}
              >
                <span>📷</span>
                <span>Ask follow-up questions about the image above</span>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Single image button */}
              <button
                onClick={() => {
                  if (multiImageMode) {
                    setMultiImageMode(false);
                    setMultiImages([]);
                  }
                  setShowUpload(!showUpload);
                }}
                className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0"
                style={{
                  background:
                    showUpload && !multiImageMode
                      ? "var(--color-accent)"
                      : "var(--color-surface)",
                  color:
                    showUpload && !multiImageMode
                      ? "white"
                      : "var(--color-text-secondary)",
                  border: `1px solid ${showUpload && !multiImageMode ? "var(--color-accent)" : "var(--color-border)"}`,
                }}
                title="Upload image (Ctrl+Shift+V)"
              >
                <ImagePlus size={18} />
              </button>

              {/* Multi-image toggle */}
              <button
                onClick={() => {
                  setMultiImageMode(!multiImageMode);
                  setShowUpload(false);
                  setImage(null);
                  if (multiImageMode) setMultiImages([]);
                }}
                className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0"
                style={{
                  background: multiImageMode
                    ? "var(--color-accent)"
                    : "var(--color-surface)",
                  color: multiImageMode
                    ? "white"
                    : "var(--color-text-secondary)",
                  border: `1px solid ${multiImageMode ? "var(--color-accent)" : "var(--color-border)"}`,
                }}
                title="Multi-image compare mode"
              >
                <Images size={18} />
              </button>

              <div
                className="flex-1 flex items-end rounded-xl border transition-colors duration-200"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface)",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    multiImageMode
                      ? multiImages.length > 0
                        ? "Ask about these images..."
                        : "Upload images to compare..."
                      : image
                        ? "Ask about this image..."
                        : hasImageContext
                          ? "Ask a follow-up about the image..."
                          : "Upload an image and ask a question..."
                  }
                  rows={1}
                  className="flex-1 px-4 py-2.5 bg-transparent outline-none resize-none text-sm leading-relaxed"
                  style={{
                    color: "var(--color-text)",
                    maxHeight: "120px",
                  }}
                  disabled={isLoading}
                />
              </div>

              {isLoading ? (
                <button
                  onClick={handleStop}
                  className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0 animate-pulse"
                  style={{
                    background: "var(--color-error)",
                    color: "white",
                  }}
                  title="Stop (Esc)"
                >
                  <StopCircle size={18} />
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit()}
                  disabled={
                    !input.trim() && !image && multiImages.length === 0
                  }
                  className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                  style={{
                    background:
                      input.trim() || image || multiImages.length > 0
                        ? "var(--color-accent)"
                        : "var(--color-surface-hover)",
                    color:
                      input.trim() || image || multiImages.length > 0
                        ? "white"
                        : "var(--color-text-secondary)",
                  }}
                  title="Send (Enter)"
                >
                  <Send size={18} />
                </button>
              )}
            </div>

            <div
              className="flex items-center justify-between text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span>Your images never leave your network.</span>
              <span className="hidden sm:inline">
                ⌘K command palette · Enter send · Esc stop
              </span>
            </div>
          </div>
        </div>

        {/* Week 3 Modals */}
        <TemplateLibrary
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelect={(prompt) => {
            setInput(prompt);
            inputRef.current?.focus();
          }}
        />

        <ImageGallery
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onSelectImage={handleGalleryNavigate}
        />

        <BatchAnalysis
          isOpen={showBatch}
          onClose={() => setShowBatch(false)}
          selectedModel={selectedModel}
        />

        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          actions={commandActions}
        />

        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          models={models}
        />

        <AnalyticsDashboard
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
