import { OutreachLayoutClient } from './layout-client';

export const metadata = { title: 'Outreach | MugData' };

export default function OutreachLayout({ children }: { children: React.ReactNode }) {
  return <OutreachLayoutClient>{children}</OutreachLayoutClient>;
}
