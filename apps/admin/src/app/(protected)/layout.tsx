import Link from "next/link";
import type { ReactNode } from "react";
import { FruitionMark } from "@fruition/brand";
import { requireAdmin } from "@/lib/admin-session";
import { signOutAction } from "../actions";
import styles from "../admin.module.css";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await requireAdmin();
  const publicSiteUrl =
    process.env.PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div className={styles.adminShell}>
      <aside className={styles.sidebar}>
        <Link href="/" aria-label="Fruition admin home">
          <FruitionMark />
        </Link>
        <nav aria-label="Admin navigation">
          <Link href="/">Idea inbox</Link>
          <Link href={`${publicSiteUrl}/#contact`}>Public intake</Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <span>Signed in as</span>
          <strong>{session.user.email}</strong>
          <form action={signOutAction}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className={styles.adminMain}>{children}</main>
    </div>
  );
}
