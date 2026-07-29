import Link from "next/link";
import type { ReactNode } from "react";
import { FruitionMark } from "@/components/fruition-mark";
import { requireAdmin } from "@/lib/admin-session";
import { signOutAction } from "../actions";
import styles from "../admin.module.css";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await requireAdmin();

  return (
    <div className={styles.adminShell}>
      <aside className={styles.sidebar}>
        <Link href="/admin" aria-label="Fruition admin home">
          <FruitionMark />
        </Link>
        <nav aria-label="Admin navigation">
          <Link href="/admin">Idea inbox</Link>
          <Link href="/#contact">Public intake</Link>
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
