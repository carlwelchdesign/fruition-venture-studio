"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import styles from "@/app/admin/admin.module.css";

type SignInState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
  developmentUrl?: string;
};

export function AdminSignInForm({ defaultEmail }: { defaultEmail: string }) {
  const requestInFlight = useRef(false);
  const [state, setState] = useState<SignInState>({
    status: "idle",
    message: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) {
      return;
    }
    requestInFlight.current = true;

    const email = String(new FormData(event.currentTarget).get("email") ?? "");

    setState({ status: "submitting", message: "Creating secure link…" });

    try {
      const response = await fetch("/api/admin/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(result.message ?? "Sign-in failed.");
      }

      const result = (await response.json()) as {
        message?: string;
        developmentUrl?: string;
      };
      setState({
        status: "success",
        message: result.message ?? "Check your email.",
        developmentUrl: result.developmentUrl,
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Sign-in failed.",
      });
    } finally {
      requestInFlight.current = false;
    }
  }

  return (
    <form className={styles.signInForm} onSubmit={handleSubmit}>
      <label htmlFor="admin-email">Authorized email</label>
      <input
        id="admin-email"
        name="email"
        type="email"
        defaultValue={defaultEmail}
        autoComplete="email"
        required
      />
      <button type="submit" disabled={state.status === "submitting"}>
        {state.status === "submitting" ? "Preparing…" : "Send secure link"}
      </button>
      <p
        className={state.status === "error" ? styles.formError : ""}
        aria-live="polite"
      >
        {state.message}
      </p>
      {state.developmentUrl ? (
        <a className={styles.developmentLink} href={state.developmentUrl}>
          Continue as local owner
        </a>
      ) : null}
    </form>
  );
}
