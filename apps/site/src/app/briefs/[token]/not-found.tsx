import Link from "next/link";
import { FruitionMark } from "@fruition/brand";
import styles from "./brief.module.css";

export default function BriefNotFound() {
  return (
    <main className={styles.unavailable}>
      <FruitionMark />
      <div>
        <span>Private Opportunity Brief</span>
        <h1>This brief is not available.</h1>
        <p>
          The private link may be incorrect, expired, revoked, or replaced.
          Contact Fruition through the original email conversation if you need
          a new link.
        </p>
        <Link href="/">Return to Fruition</Link>
      </div>
    </main>
  );
}
