"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MAX_PROJECT_DETAILS_CHARACTERS } from "@fruition/contracts/contact";
import type { ContactSuccessResponse } from "@fruition/contracts/founder-brief";
import { ArrowUpRight } from "./arrow-up-right";
import styles from "./contact-form.module.css";

type SubmissionState =
  | { status: "idle"; message: "" }
  | { status: "submitting"; message: string }
  | {
      status: "success";
      message: string;
      reference: string;
      maskedEmail: string;
      confirmationEmail: "sent" | "unavailable";
    }
  | { status: "error"; message: string };

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return email;
  }
  return `${localPart.slice(0, 1)}${"•".repeat(Math.min(4, Math.max(2, localPart.length - 1)))}@${domain}`;
}

export function ContactForm() {
  const submissionInFlight = useRef(false);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
    message: "",
  });
  const [projectDetailsLength, setProjectDetailsLength] = useState(0);
  const projectDetailsOverLimit =
    projectDetailsLength > MAX_PROJECT_DETAILS_CHARACTERS;

  useEffect(() => {
    if (submission.status === "success") {
      successHeadingRef.current?.focus();
    }
  }, [submission.status]);

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

      const result = (await response.json()) as ContactSuccessResponse;
      form.reset();
      setProjectDetailsLength(0);
      setSubmission({
        status: "success",
        message: result.message ?? "Your idea is in.",
        reference: result.reference,
        maskedEmail: maskEmail(String(values.email ?? "")),
        confirmationEmail: result.confirmationEmail,
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

  if (submission.status === "success") {
    return (
      <section className={styles.confirmation} aria-labelledby="submission-confirmation-title">
        <div className={styles.confirmationRule} />
        <p className={styles.confirmationEyebrow}>Submission received</p>
        <h3
          id="submission-confirmation-title"
          ref={successHeadingRef}
          tabIndex={-1}
        >
          {submission.message}
        </h3>
        <p className={styles.confirmationLead}>
          Your reference is <strong>{submission.reference}</strong>. Keep it
          with the confirmation email for future conversations.
        </p>

        <div className={styles.confirmationEmail}>
          <span>Email receipt</span>
          <strong>{submission.maskedEmail}</strong>
          <p>
            {submission.confirmationEmail === "sent"
              ? "A concise receipt and these next steps are on their way."
              : "Your submission is safely stored, but the email receipt could not be sent. Please save this reference."}
          </p>
        </div>

        <div className={styles.nextSteps}>
          <p>What happens next</p>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Personal review</strong>
                <p>Fruition reviews the opportunity for clarity and fit.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Selective research</strong>
                <p>
                  Promising ideas may move into AI-assisted, public-source
                  research and human review.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Opportunity Brief</strong>
                <p>
                  If selected, you may receive a private, reviewed report by
                  email. Not every submission receives one.
                </p>
              </div>
            </li>
          </ol>
        </div>

        <p className={styles.confirmationNote}>
          There is no automatic investment decision or guaranteed response. If
          you need to add important context, reply to your receipt email.
        </p>

        <div className={styles.confirmationActions}>
          <button
            type="button"
            onClick={() =>
              setSubmission({
                status: "idle",
                message: "",
              })
            }
          >
            Submit another idea
          </button>
          <a href="#top">Return to site</a>
        </div>
      </section>
    );
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
