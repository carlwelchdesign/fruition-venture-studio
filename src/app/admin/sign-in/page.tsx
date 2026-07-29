import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSignInForm } from "@/components/admin-sign-in-form";
import { FruitionMark } from "@/components/fruition-mark";
import { getDefaultAdminEmail } from "@/lib/admin-access";
import { getAdminSession } from "@/lib/admin-session";
import styles from "../admin.module.css";

export default async function AdminSignInPage() {
  if (await getAdminSession()) {
    redirect("/admin");
  }

  return (
    <main className={styles.signInPage}>
      <div className={styles.signInPanel}>
        <FruitionMark />
        <p className={styles.kicker}>Private idea intelligence</p>
        <h1>Owner access.</h1>
        <p className={styles.signInIntro}>
          Review submissions, commission specialist research, and make the
          final venture decision.
        </p>
        <AdminSignInForm defaultEmail={getDefaultAdminEmail()} />
        <Link className={styles.backLink} href="/">
          Return to fruition.studio
        </Link>
      </div>
      <div className={styles.signInArchitecture} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
