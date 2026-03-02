import { ChatInterface } from "@/components/chat-interface";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DataMug — AI Vision Chat",
  description: "Upload images and chat with AI vision models. Private and fast.",
};

export default function ChatPage() {
  return (
    <main className="h-screen flex flex-col">
      <ChatInterface />
    </main>
  );
}
