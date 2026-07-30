export type SpecialistDefinition = {
  role:
    | "CUSTOMER_PROBLEM"
    | "MARKET_COMPETITION"
    | "PRODUCT_MVP"
    | "TECHNICAL_AI"
    | "BUSINESS_GTM"
    | "MARKET_FINANCE"
    | "RISK_TRUST";
  name: string;
  focus: string;
};

export const specialistDefinitions: SpecialistDefinition[] = [
  {
    role: "CUSTOMER_PROBLEM",
    name: "Customer and Problem Researcher",
    focus:
      "Test the severity, frequency, urgency, and customer clarity of the stated problem. Find credible evidence of current pain and behavior.",
  },
  {
    role: "MARKET_COMPETITION",
    name: "Market and Competition Researcher",
    focus:
      "Map the market, alternatives, competitors, adjacent categories, demand signals, and realistic differentiation opportunities.",
  },
  {
    role: "PRODUCT_MVP",
    name: "Product and MVP Strategist",
    focus:
      "Define the smallest credible validation path and MVP. Identify assumptions to test before expensive implementation.",
  },
  {
    role: "TECHNICAL_AI",
    name: "Technical and AI Architect",
    focus:
      "Assess technical feasibility, data needs, architecture risks, security, AI suitability, cost drivers, and a credible initial system boundary.",
  },
  {
    role: "BUSINESS_GTM",
    name: "Business Model and Go-to-Market Researcher",
    focus:
      "Evaluate buyer, pricing logic, revenue path, distribution options, sales friction, capital needs, and early commercial experiments.",
  },
  {
    role: "MARKET_FINANCE",
    name: "Market Economics and Venture Finance Researcher",
    focus:
      "Build a transparent, assumption-led venture model. Research market sizing evidence, pricing benchmarks, unit economics, cost structure, capital requirements, and conservative, base, and upside three-year scenarios. Never invent missing values: use null, identify the evidence gap, and keep sourced facts distinct from estimates.",
  },
  {
    role: "RISK_TRUST",
    name: "Risk and Trust Researcher",
    focus:
      "Identify privacy, safety, legal, regulatory, operational, reputational, and adoption risks. Flag where professional advice is needed rather than giving it.",
  },
];
