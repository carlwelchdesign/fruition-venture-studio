import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const siteRoot = path.join(root, "apps", "site");
const forbiddenDependencies = [
  "@fruition/database",
  "@openai/agents",
  "@prisma/client",
  "better-auth",
  "workflow",
];
const forbiddenSourcePatterns = [
  /OPENAI_API_KEY/,
  /BETTER_AUTH_SECRET/,
  /\bDATABASE_URL\b/,
  /(?:from|import)\s*\(?["']@fruition\/database/,
  /(?:from|import)\s*\(?["']@openai\/agents/,
  /(?:from|import)\s*\(?["']better-auth/,
  /(?:from|import)\s*\(?["']workflow/,
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(entryPath)));
    } else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

const packageJson = JSON.parse(
  await readFile(path.join(siteRoot, "package.json"), "utf8"),
);
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
const dependencyViolations = forbiddenDependencies.filter(
  (dependency) => dependency in dependencies,
);

const sourceViolations = [];
for (const file of await sourceFiles(path.join(siteRoot, "src"))) {
  const contents = await readFile(file, "utf8");
  for (const pattern of forbiddenSourcePatterns) {
    if (pattern.test(contents)) {
      sourceViolations.push(
        `${path.relative(root, file)} contains ${String(pattern)}`,
      );
    }
  }
}

if (dependencyViolations.length || sourceViolations.length) {
  console.error("Public application boundary verification failed.");
  for (const dependency of dependencyViolations) {
    console.error(`- apps/site depends on ${dependency}`);
  }
  for (const violation of sourceViolations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(
  "Public application boundary verified: no admin, AI, auth, workflow, or privileged database dependencies.",
);
