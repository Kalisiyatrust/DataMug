"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  Bot,
  Info,
  Phone,
  MoreVertical,
  Tag,
  X,
  ChevronLeft,
  RefreshCw,
  Smile,
  Paperclip,
  MessageSquare,
} from "lucide-react";
import { BrandBadge } from "@/components/whatsapp/brand-badge";
import { StageBadge } from "@/components/whatsapp/stage-badge";
import { ScoreCircle } from "@/components/whatsapp/score-indicator";
import { MessageBubble } from "@/components/whatsapp/message-bubble";
import type { Brand } from "@/components/whatsapp/brand-badge";
import type { Stage } from "@/components/whatsapp/stage-badge";
import type { MessageDirection, MessageStatus } from "@/components/whatsapp/message-bubble";

// ─── Types ────────────────────────────────────────────────────

interface Message {
  id: string;
  direction: MessageDirection;
  content: string;
  timestamp: string;
  status: MessageStatus;
}

interface Conversation {
  id: string;
  contactName: string;
  phone: string;
  brand: Brand;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  stage: Stage;
  score: number;
  tags: string[];
  company: string;
  messages: Message[];
}

// ─── Mock Data ────────────────────────────────────────────────

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1", contactName: "Sarah Chen", phone: "+44 7700 900123", brand: "Kalisiya",
    lastMessage: "Yes, I'm interested in the premium plan", lastTime: "2m ago", unreadCount: 2,
    stage: "qualified", score: 78, tags: ["hot-lead", "enterprise"], company: "TechFlow Ltd",
    messages: [
      { id: "m1", direction: "outbound", content: "Hi Sarah! Thanks for signing up. How can we help you today?", timestamp: "09:30", status: "read" },
      { id: "m2", direction: "inbound", content: "Hi! I saw your pricing page and I'm interested in the premium plan for my team.", timestamp: "09:45", status: "read" },
      { id: "m3", direction: "outbound", content: "That's great to hear! The premium plan includes unlimited contacts, advanced analytics, and priority support. How many team members would you need seats for?", timestamp: "09:47", status: "read" },
      { id: "m4", direction: "inbound", content: "We're a team of about 12. Can you send me a custom quote?", timestamp: "09:52", status: "read" },
      { id: "m5", direction: "outbound", content: "Absolutely! I'll prepare a custom quote for 12 seats and send it over shortly. Any specific features you need?", timestamp: "09:55", status: "delivered" },
      { id: "m6", direction: "inbound", content: "Yes, I'm interested in the premium plan", timestamp: "10:02", status: "read" },
    ],
  },
  {
    id: "2", contactName: "James Okafor", phone: "+234 801 234 5678", brand: "Eloi",
    lastMessage: "Can we schedule a call?", lastTime: "5m ago", unreadCount: 1,
    stage: "engaged", score: 62, tags: ["callback-requested"], company: "Lagos Digital",
    messages: [
      { id: "m1", direction: "outbound", content: "Hello James, this is the Eloi team. We noticed you visited our website recently.", timestamp: "08:00", status: "read" },
      { id: "m2", direction: "inbound", content: "Thanks for reaching out! Can we schedule a call?", timestamp: "08:30", status: "read" },
    ],
  },
  {
    id: "3", contactName: "Priya Sharma", phone: "+91 98765 43210", brand: "DataMug",
    lastMessage: "Following up on your inquiry...", lastTime: "12m ago", unreadCount: 0,
    stage: "contacted", score: 45, tags: ["follow-up"], company: "Sharma Analytics",
    messages: [
      { id: "m1", direction: "outbound", content: "Hi Priya, following up on your inquiry about our data analytics solution.", timestamp: "Yesterday", status: "read" },
      { id: "m2", direction: "inbound", content: "Yes, I need more time to evaluate. Can you send me a case study?", timestamp: "Yesterday", status: "read" },
      { id: "m3", direction: "outbound", content: "Of course! I'm sending you 3 relevant case studies now.", timestamp: "Yesterday", status: "read" },
    ],
  },
  {
    id: "4", contactName: "Marco Rossi", phone: "+39 02 1234 5678", brand: "Kalisiya",
    lastMessage: "What are the pricing options?", lastTime: "18m ago", unreadCount: 3,
    stage: "new", score: 30, tags: ["pricing-inquiry"], company: "Rossi SpA",
    messages: [
      { id: "m1", direction: "inbound", content: "Hello, I found you on LinkedIn. What are the pricing options?", timestamp: "10:00", status: "read" },
      { id: "m2", direction: "inbound", content: "Do you have monthly plans?", timestamp: "10:01", status: "read" },
      { id: "m3", direction: "inbound", content: "What are the pricing options?", timestamp: "10:05", status: "read" },
    ],
  },
  {
    id: "5", contactName: "Aisha Patel", phone: "+971 50 123 4567", brand: "Eloi",
    lastMessage: "Your proposal looks great, moving forward!", lastTime: "25m ago", unreadCount: 0,
    stage: "converted", score: 92, tags: ["customer", "vip"], company: "Dubai Ventures",
    messages: [
      { id: "m1", direction: "outbound", content: "Hi Aisha, we've prepared a tailored proposal for Dubai Ventures.", timestamp: "Mon 09:00", status: "read" },
      { id: "m2", direction: "inbound", content: "Received it, looks comprehensive!", timestamp: "Mon 14:00", status: "read" },
      { id: "m3", direction: "inbound", content: "Your proposal looks great, moving forward!", timestamp: "Mon 16:30", status: "read" },
    ],
  },
  {
    id: "6", contactName: "Tom Bradley", phone: "+1 555 234 5678", brand: "DataMug",
    lastMessage: "Welcome to DataMug!", lastTime: "34m ago", unreadCount: 0,
    stage: "new", score: 20, tags: ["new-user"], company: "Bradley & Co",
    messages: [
      { id: "m1", direction: "outbound", content: "Welcome to DataMug, Tom! Here's how to get started with our platform...", timestamp: "10:30", status: "read" },
    ],
  },
];

const BRANDS: Brand[] = ["All Brands", "Kalisiya", "Eloi", "DataMug"];

const AI_SUGGESTIONS: Record<string, string> = {
  "1": "Hi Sarah! I'd be happy to prepare a custom quote for your 12-person team. Based on your needs, I'd recommend our Premium Business plan at £45/seat/month which includes unlimited contacts, advanced analytics, and dedicated support. Shall I send the full breakdown?",
  "2": "Of course, James! I'd love to connect on a call. Are you available this week? I have slots on Thursday 2-4 PM or Friday 10-12 AM. Which works best for you?",
  "3": "Hi Priya! Following up — did you get a chance to review those case studies? I'm happy to walk you through them on a 15-minute call if that would help.",
  "4": "Hi Marco! Great to hear from you. We have flexible plans starting from €29/month for small teams. I can send you a full comparison — which features are most important for your business?",
  default: "Thank you for your message. I'll get back to you shortly with the information you need.",
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const [brandFilter, setBrandFilter] = useState<Brand>("All Brands");
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, conversations]);

  const filtered = conversations.filter((c) => {
    const matchesBrand = brandFilter === "All Brands" || c.brand === brandFilter;
    const matchesSearch =
      !search ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.company.toLowerCase().includes(search.toLowerCase());
    return matchesBrand && matchesSearch;
  });

  const selected = conversations.find((c) => c.id === selectedId);

  const sendMessage = () => {
    if (!messageText.trim() || !selectedId) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: `m${Date.now()}`,
                  direction: "outbound" as MessageDirection,
                  content: messageText,
                  timestamp: now,
                  status: "sent" as MessageStatus,
                },
              ],
              lastMessage: messageText,
              lastTime: "now",
            }
          : c
      )
    );
    setMessageText("");
  };

  const getAISuggestion = () => {
    if (!selectedId) return;
    setAiLoading(true);
    setTimeout(() => {
      const suggestion = AI_SUGGESTIONS[selectedId] ?? AI_SUGGESTIONS.default;
      setMessageText(suggestion);
      setAiLoading(false);
    }, 1200);
  };

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setMobileView("chat");
    // Mark as read
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation List */}
      <div
        className={`flex flex-col border-r flex-shrink-0 ${
          mobileView === "chat" ? "hidden sm:flex" : "flex"
        } w-full sm:w-72 lg:w-80`}
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Search + filter */}
        <div className="p-3 space-y-2 border-b flex-shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {BRANDS.map((brand) => (
              <button
                key={brand}
                onClick={() => setBrandFilter(brand)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                  brandFilter === brand
                    ? "bg-blue-600 text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                {brand === "All Brands" ? "All" : brand}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 px-4 py-3 border-b animate-pulse" style={{ borderColor: "var(--color-border)" }}>
                <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-24" />
                  <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-36" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-6">
              <MessageSquare size={24} className="text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-sm text-stone-400 dark:text-stone-500">No conversations found</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full flex gap-3 px-4 py-3 border-b text-left transition-colors ${
                  selectedId === conv.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-600"
                    : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                }`}
                style={{ borderBottomColor: "var(--color-border)" }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-sm font-medium text-stone-600 dark:text-stone-400">
                    {conv.contactName[0]}
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-semibold text-stone-900 dark:text-stone-100" : "font-medium text-stone-700 dark:text-stone-300"}`}>
                      {conv.contactName}
                    </p>
                    <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">
                      {conv.lastTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <BrandBadge brand={conv.brand} size="sm" showDot />
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "text-stone-700 dark:text-stone-300" : "text-stone-400 dark:text-stone-500"}`}>
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          mobileView === "list" ? "hidden sm:flex" : "flex"
        }`}
      >
        {selected ? (
          <>
            {/* Chat header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-3">
                <button
                  className="sm:hidden p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  onClick={() => setMobileView("list")}
                >
                  <ChevronLeft size={18} className="text-stone-500" />
                </button>
                <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-sm font-medium text-stone-600 dark:text-stone-400">
                  {selected.contactName[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {selected.contactName}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-stone-400 dark:text-stone-500">
                      {selected.phone}
                    </span>
                    <BrandBadge brand={selected.brand} size="sm" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                  <Phone size={16} className="text-stone-500" />
                </button>
                <button
                  onClick={() => setShowInfo((s) => !s)}
                  className={`p-2 rounded-lg transition-colors ${showInfo ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"}`}
                >
                  <Info size={16} />
                </button>
                <button className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                  <MoreVertical size={16} className="text-stone-500" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 flex flex-col min-w-0">
                <div
                  className="flex-1 overflow-y-auto px-4 py-4"
                  style={{ background: "var(--color-bg)" }}
                >
                  {selected.messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      direction={msg.direction}
                      content={msg.content}
                      timestamp={msg.timestamp}
                      status={msg.status}
                      senderName={selected.contactName}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div
                  className="p-3 border-t flex-shrink-0"
                  style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full px-4 py-2.5 pr-10 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none max-h-32 transition-colors"
                        style={{ minHeight: "40px" }}
                      />
                      <button className="absolute right-2.5 bottom-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                        <Smile size={16} />
                      </button>
                    </div>
                    <button className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex-shrink-0">
                      <Paperclip size={16} />
                    </button>
                    <button
                      onClick={getAISuggestion}
                      disabled={aiLoading}
                      title="AI Reply Suggestion"
                      className="p-2.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      {aiLoading ? <RefreshCw size={16} className="animate-spin" /> : <Bot size={16} />}
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={!messageText.trim()}
                      className="p-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 px-1">
                    Press Enter to send · Shift+Enter for new line · <span className="text-violet-500">✦ AI Reply</span> to generate suggestion
                  </p>
                </div>
              </div>

              {/* Contact info sidebar */}
              {showInfo && (
                <div
                  className="w-64 border-l flex-shrink-0 overflow-y-auto"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Contact Info
                    </h3>
                    <button
                      onClick={() => setShowInfo(false)}
                      className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <X size={14} className="text-stone-400" />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xl font-bold text-stone-600 dark:text-stone-400 mx-auto mb-2">
                        {selected.contactName[0]}
                      </div>
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {selected.contactName}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{selected.company}</p>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 dark:text-stone-400">Phone</span>
                        <span className="font-medium text-stone-700 dark:text-stone-300">{selected.phone}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 dark:text-stone-400">Brand</span>
                        <BrandBadge brand={selected.brand} size="sm" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 dark:text-stone-400">Stage</span>
                        <StageBadge stage={selected.stage} size="sm" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 dark:text-stone-400">Lead Score</span>
                        <ScoreCircle score={selected.score} />
                      </div>
                    </div>

                    {selected.tags.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Tag size={12} className="text-stone-400" />
                          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
                        Stage Progress
                      </p>
                      <div className="space-y-1">
                        {(["new", "contacted", "engaged", "qualified", "converted"] as Stage[]).map(
                          (stage) => {
                            const stages: Stage[] = ["new", "contacted", "engaged", "qualified", "converted"];
                            const currentIdx = stages.indexOf(selected.stage);
                            const thisIdx = stages.indexOf(stage);
                            return (
                              <div key={stage} className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    thisIdx <= currentIdx
                                      ? "bg-blue-500"
                                      : "bg-stone-200 dark:bg-stone-700"
                                  }`}
                                />
                                <span
                                  className={`text-xs capitalize ${
                                    stage === selected.stage
                                      ? "font-semibold text-blue-600 dark:text-blue-400"
                                      : thisIdx < currentIdx
                                      ? "text-stone-500 dark:text-stone-400"
                                      : "text-stone-300 dark:text-stone-600"
                                  }`}
                                >
                                  {stage}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-stone-300 dark:text-stone-600" />
            </div>
            <h3 className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Select a conversation
            </h3>
            <p className="text-sm text-stone-400 dark:text-stone-500">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


