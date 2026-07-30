export const projectStages = [
  "idea",
  "validation",
  "prototype",
  "existing-business",
] as const;

export const MAX_PROJECT_DETAILS_CHARACTERS = 50_000;

export type ContactSubmission = {
  name: string;
  email: string;
  organization: string;
  projectStage: (typeof projectStages)[number];
  projectDetails: string;
  analysisConsent: true;
};

type ValidationResult =
  | { success: true; data: ContactSubmission }
  | { success: false; message: string };

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateContactSubmission(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { success: false, message: "Please complete the required fields." };
  }

  const values = input as Record<string, unknown>;
  const name = cleanString(values.name);
  const email = cleanString(values.email).toLowerCase();
  const organization = cleanString(values.organization);
  const projectStage = cleanString(values.projectStage);
  const projectDetails = cleanString(values.projectDetails);
  const website = cleanString(values.website);
  const analysisConsent =
    values.analysisConsent === true || values.analysisConsent === "on";

  if (website) {
    return { success: false, message: "Unable to process this submission." };
  }

  if (name.length < 2 || name.length > 80) {
    return { success: false, message: "Please enter your name." };
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { success: false, message: "Please enter a valid email address." };
  }

  if (organization.length > 100) {
    return {
      success: false,
      message: "Organization names must be 100 characters or fewer.",
    };
  }

  if (!projectStages.includes(projectStage as ContactSubmission["projectStage"])) {
    return { success: false, message: "Please select your current stage." };
  }

  if (
    projectDetails.length < 20 ||
    projectDetails.length > MAX_PROJECT_DETAILS_CHARACTERS
  ) {
    return {
      success: false,
      message: `Please share between 20 and ${MAX_PROJECT_DETAILS_CHARACTERS.toLocaleString("en-US")} characters.`,
    };
  }

  if (!analysisConsent) {
    return {
      success: false,
      message: "Please confirm how Fruition will use your submission.",
    };
  }

  return {
    success: true,
    data: {
      name,
      email,
      organization,
      projectStage: projectStage as ContactSubmission["projectStage"],
      projectDetails,
      analysisConsent: true,
    },
  };
}
