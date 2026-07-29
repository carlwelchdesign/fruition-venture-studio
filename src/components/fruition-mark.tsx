import styles from "./fruition-mark.module.css";

export function FruitionMark({ label = true }: { label?: boolean }) {
  return (
    <span className={styles.lockup}>
      <svg
        className={styles.mark}
        viewBox="0 0 42 52"
        aria-hidden="true"
      >
        <path d="M2 3h31" />
        <path d="M9 12v36" />
        <path d="M9 20h25" />
        <path d="M9 31h18" />
      </svg>
      {label ? (
        <span className={styles.label}>
          <strong>Fruition</strong>
          <small>Venture Studio</small>
        </span>
      ) : null}
    </span>
  );
}
