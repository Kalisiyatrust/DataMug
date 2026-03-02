import { WhatsAppLayoutClient } from "./layout-client";

export const metadata = {
  title: "WhatsApp Marketing",
  description: "WhatsApp Marketing Dashboard — DataMug",
};

export default function WhatsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WhatsAppLayoutClient>{children}</WhatsAppLayoutClient>;
}
