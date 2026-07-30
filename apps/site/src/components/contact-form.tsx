"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { MAX_PROJECT_DETAILS_CHARACTERS } from "@fruition/contracts/contact";
import { ArrowUpRight } from "./arrow-up-right";
import styles from "./contact-form.module.css";

type SubmissionState =
  | { status: "idle"; message: "" }
  | { status: "submitting"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function ContactForm() {
  const submissionInFlight = useRef(false);
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
    message: "",
  });
  const [projectDetailsLength, setProjectDetailsLength] = useState(0);
  const projectDetailsOverLimit =
    projectDetailsLength > MAX_PROJECT_DETAILS_CHARACTERS;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) {
      return;
    }

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const projectDetails =
      typeof values.projectDetails === "string" ? values.projectDetails : "";
    if (projectDetails.length > MAX_PROJECT_DETAILS_CHARACTERS) {
      setSubmission({
        status: "error",
        message: `Your opportunity brief is ${(
          projectDetails.length - MAX_PROJECT_DETAILS_CHARACTERS
        ).toLocaleString("en-US")} characters over the limit. Shorten it before sending.`,
      });
      return;
    }

    submissionInFlight.current = true;

    setSubmission({
      status: "submitting",
      message: "Sending your note…",
    });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          result.message ?? "Your note could not be sent. Please try again.",
        );
      }

      const result = (await response.json()) as { message?: string };
      form.reset();
      setProjectDetailsLength(0);
      setSubmission({
        status: "success",
        message:
          result.message ??
          "Thank you. Your note has been received, and we’ll be in touch.",
      });
    } catch (error) {
      setSubmission({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Your note could not be sent. Please try again.",
      });
    } finally {
      submissionInFlight.current = false;
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.twoColumn}>
        <div className={styles.field}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" autoComplete="name" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className={styles.twoColumn}>
        <div className={styles.field}>
          <label htmlFor="organization">
            Organization <span>Optional</span>
          </label>
          <input
            id="organization"
            name="organization"
            autoComplete="organization"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="projectStage">Where are you now?</label>
          <select id="projectStage" name="projectStage" required defaultValue="">
            <option value="" disabled>
              Select a stage
            </option>
            <option value="idea">I have a well-formed idea</option>
            <option value="validation">I am validating the opportunity</option>
            <option value="prototype">I have a prototype</option>
            <option value="existing-business">I have an existing business</option>
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="projectDetails">
          Tell us about the opportunity
          <span>What problem are you uniquely positioned to solve?</span>
        </label>
        <textarea
          aria-describedby="projectDetails-guidance projectDetails-count"
          aria-invalid={projectDetailsOverLimit}
          id="projectDetails"
          name="projectDetails"
          rows={6}
          minLength={20}
          onChange={(event) =>
            setProjectDetailsLength(event.currentTarget.value.length)
          }
          required
        />
        <div className={styles.fieldMeta}>
          <p id="projectDetails-guidance">
            Paste a complete brief or detailed notes. Please exclude
            confidential or proprietary information.
          </p>
          <p
            className={projectDetailsOverLimit ? styles.characterLimit : ""}
            id="projectDetails-count"
          >
            {projectDetailsOverLimit
              ? `${(
                  projectDetailsLength - MAX_PROJECT_DETAILS_CHARACTERS
                ).toLocaleString("en-US")} over limit — shorten before sending`
              : `${projectDetailsLength.toLocaleString("en-US")} / ${MAX_PROJECT_DETAILS_CHARACTERS.toLocaleString("en-US")}`}
          </p>
          <span className={styles.visuallyHidden} aria-live="polite">
            {projectDetailsOverLimit
              ? `Your opportunity brief is ${(
                  projectDetailsLength - MAX_PROJECT_DETAILS_CHARACTERS
                ).toLocaleString("en-US")} characters over the limit. Shorten it before sending.`
              : ""}
          </span>
        </div>
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <label className={styles.consent}>
        <input name="analysisConsent" type="checkbox" required />
        <span>
          I understand that Fruition will store this submission and may use
          AI-assisted, public-source research to evaluate the opportunity. I
          have not included confidential or proprietary information.
        </span>
      </label>

      <div className={styles.formFooter}>
        <p>
          By submitting, you also agree that Fruition may contact you about
          your inquiry.
        </p>
        <button
          data-submitting={submission.status === "submitting"}
          type="submit"
          disabled={
            submission.status === "submitting" || projectDetailsOverLimit
          }
        >
          {submission.status === "submitting" ? "Sending…" : "Send inquiry"}
          <ArrowUpRight />
        </button>
      </div>

      <p
        className={`${styles.status} ${
          submission.status === "error" ? styles.statusError : ""
        }`}
        aria-live="polite"
      >
        {submission.message}
      </p>
    </form>
  );
}
