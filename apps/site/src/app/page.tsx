import Image from "next/image";
import { ArrowUpRight } from "@/components/arrow-up-right";
import { ContactForm } from "@/components/contact-form";
import styles from "./page.module.css";

const services = [
  { icon: "idea", label: "Idea evaluation" },
  { icon: "strategy", label: "Product strategy" },
  { icon: "architecture", label: "Architecture & design" },
  { icon: "engineering", label: "AI engineering" },
  { icon: "launch", label: "Launch & scale" },
  { icon: "partnership", label: "Long-term partnership" },
] as const;

const processSteps = [
  {
    number: "01",
    title: "Evaluate the idea",
    body: "Pressure-test the problem, market, founder fit, and path to revenue before committing to a build.",
  },
  {
    number: "02",
    title: "Design the company",
    body: "Shape the product, business model, customer journey, and technical foundation as one connected system.",
  },
  {
    number: "03",
    title: "Build the right product",
    body: "Create the smallest credible product with senior engineering judgment and AI-accelerated execution.",
  },
  {
    number: "04",
    title: "Launch and grow",
    body: "Learn from the market, develop the platform, and build the team around a durable opportunity.",
  },
];

const partnershipPoints = [
  {
    title: "Strategy",
    body: "A clear business case, an honest view of risk, and a focused path to market.",
  },
  {
    title: "Architecture",
    body: "Security, data, cost, maintainability, and growth considered before they become expensive constraints.",
  },
  {
    title: "Execution",
    body: "One experienced product and engineering partner from the first workshop through launch.",
  },
  {
    title: "Shared upside",
    body: "For exceptional opportunities, cash supports the work and equity aligns the long-term outcome.",
  },
];

type ServiceIconProps = {
  kind: (typeof services)[number]["icon"];
};

function ServiceIcon({ kind }: ServiceIconProps) {
  if (kind === "idea") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M10 21c-2-2-4-5-4-8a10 10 0 0 1 20 0c0 3-2 6-4 8-2 2-2 3-2 4h-8c0-1 0-2-2-4Z" />
        <path d="M12 28h8M16 1v3M3 13H0M32 13h-3" />
      </svg>
    );
  }

  if (kind === "strategy") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5 3h22v26H5zM9 9h14M9 14h10M9 19h12M9 24h7" />
      </svg>
    );
  }

  if (kind === "architecture") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="m16 2 12 7v14l-12 7-12-7V9l12-7Z" />
        <path d="m4 9 12 7 12-7M16 16v14" />
      </svg>
    );
  }

  if (kind === "engineering") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="m12 5-10 11 10 11M20 5l10 11-10 11" />
      </svg>
    );
  }

  if (kind === "launch") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M12 20c-4 1-7 4-8 8 4-1 7-3 8-7M20 12c1-4 4-7 8-8-1 4-3 7-7 8" />
        <path d="M10 22 6 26M12 20c-2-6 3-12 16-16 0 13-6 18-16 16Z" />
        <circle cx="21" cy="11" r="2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="10" cy="10" r="5" />
      <circle cx="23" cy="11" r="4" />
      <path d="M1 29c0-7 3-11 9-11s9 4 9 11M18 29c0-6 2-10 6-10s7 4 7 10" />
    </svg>
  );
}

function Monogram() {
  return (
    <span className={styles.monogram} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`${styles.wordmark} ${compact ? styles.wordmarkCompact : ""}`}>
      <span className={styles.srOnly}>Fruition Venture Studio</span>
      <span className={styles.wordmarkLetters} aria-hidden="true">
        <span>F</span>
        <span>R</span>
        <span>U</span>
        <span>I</span>
        <span>T</span>
        <span>I</span>
        <span className={styles.brokenO} />
        <span>N</span>
      </span>
      <span className={styles.wordmarkDescriptor} aria-hidden="true">
        <i />
        Venture Studio
        <i />
      </span>
    </span>
  );
}

export default function Home() {
  return (
    <main id="top">
      <header className={styles.header}>
        <a href="#top" aria-label="Fruition home">
          <Wordmark compact />
        </a>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#studio">Studio</a>
          <a href="#approach">Approach</a>
          <a href="#partnership">Partnership</a>
          <a className={styles.navContact} href="#contact">
            Contact
          </a>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Independent venture studio · Serving Ojai | Montecito | Santa Barbara</p>
          <h1 id="hero-title">
            From concept
            <br />
            to company.
          </h1>
          <span className={styles.goldRule} aria-hidden="true" />
          <p className={styles.heroSummary}>
            We partner with founders and domain experts to validate, design,
            build, and launch enduring software companies.
          </p>
          <a className={styles.outlineButton} href="#contact">
            Let&apos;s build <ArrowUpRight />
          </a>
        </div>
        <div className={styles.heroImage}>
          <Image
            src="/images/fruition-architecture.jpg"
            alt=""
            fill
            sizes="(max-width: 800px) 100vw, 52vw"
            loading="eager"
          />
          <div className={styles.imageShade} />
          <div className={styles.heroSideCopy}>
            <span>Strategy</span>
            <span>Architecture</span>
            <span>Execution</span>
            <span>Growth</span>
          </div>
        </div>
      </section>

      <section className={styles.serviceRail} aria-label="Studio capabilities">
        {services.map((service) => (
          <div key={service.label}>
            <ServiceIcon kind={service.icon} />
            <span>{service.label}</span>
          </div>
        ))}
      </section>

      <section className={styles.studio} id="studio" aria-labelledby="studio-title">
        <div className={styles.sectionLabel}>
          <span>01</span>
          <p>The studio</p>
        </div>
        <div className={styles.studioStatement}>
          <h2 id="studio-title">
            Great ideas need more
            <br />
            than <em>code.</em>
          </h2>
          <p>
            A prototype can prove that something works. A company needs the
            right problem, product, architecture, market, and operating
            decisions working together.
          </p>
        </div>
        <div className={styles.studioAside}>
          <Monogram />
          <p>
            Fruition brings two decades of product and engineering judgment to
            the decisions that matter most—at the beginning.
          </p>
        </div>
      </section>

      <section className={styles.approach} id="approach" aria-labelledby="approach-title">
        <div className={styles.approachHeading}>
          <div className={styles.sectionLabel}>
            <span>02</span>
            <p>Our approach</p>
          </div>
          <h2 id="approach-title">
            A disciplined path
            <br />
            from idea to market.
          </h2>
        </div>
        <div className={styles.processGrid}>
          {processSteps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className={styles.partnership}
        id="partnership"
        aria-labelledby="partnership-title"
      >
        <div className={styles.partnershipImage}>
          <Image
            src="/images/fruition-architecture.jpg"
            alt=""
            fill
            sizes="(max-width: 800px) 100vw, 48vw"
            loading="eager"
          />
        </div>
        <div className={styles.partnershipContent}>
          <div className={styles.sectionLabel}>
            <span>03</span>
            <p>The partnership</p>
          </div>
          <h2 id="partnership-title">
            Built together.
            <br />
            Built to endure.
          </h2>
          <p className={styles.partnershipIntro}>
            Fruition is not a general-purpose development shop. We work with a
            small number of capable founders where strong domain knowledge and
            serious ambition can become a valuable company.
          </p>
          <div className={styles.partnershipList}>
            {partnershipPoints.map((point, index) => (
              <article key={point.title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{point.title}</h3>
                  <p>{point.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.contact} id="contact" aria-labelledby="contact-title">
        <div className={styles.contactIntro}>
          <div className={styles.sectionLabel}>
            <span>04</span>
            <p>Start a conversation</p>
          </div>
          <h2 id="contact-title">
            What are you ready
            <br />
            to bring to fruition?
          </h2>
          <p>
            Share the problem you know deeply, the opportunity you see, and why
            now is the right time to explore it.
          </p>
        </div>
        <ContactForm />
      </section>

      <footer className={styles.footer}>
        <a href="#top" aria-label="Back to top">
          <Wordmark compact />
        </a>
        <p>Ojai | Montecito | Santa Barbara</p>
        <p>© {new Date().getFullYear()} Fruition Venture Studio</p>
      </footer>
    </main>
  );
}
