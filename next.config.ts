import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
};

export default withWorkflow(nextConfig);
