import Link from "next/link";

const steps = [
  {
    number: "1",
    title: "Customer Submits a Request",
    text: "Customer fills a short form with their service need and contact details.",
  },
  {
    number: "2",
    title: "Smart Provider Matching",
    text: "Our engine assigns exactly 3 verified providers based on service type, fair rotation, and monthly availability.",
  },
  {
    number: "3",
    title: "Providers Notified Instantly",
    text: "Matched providers see the new lead in real time on their dashboard and can follow up immediately.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="surface px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="card mx-auto w-full max-w-140 p-6 text-center sm:p-10">
          <span className="badge-pill bg-brand-accent/10 text-brand-accent">
            Lead Distribution Platform
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-brand-text sm:text-5xl">
            Connect customers to the right service provider — instantly.
          </h1>
          <p className="mt-4 text-base leading-7 text-brand-muted sm:text-lg">
            Prowider routes inbound service requests to verified providers based on service type, fair rotation, and monthly quotas.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/request-service"
              className="button-primary inline-flex h-12 items-center justify-center px-5 text-sm font-semibold"
            >
              Submit a Service Request
            </Link>
            <Link
              href="/dashboard"
              className="button-outline inline-flex h-12 items-center justify-center px-5 text-sm font-semibold"
            >
              View Provider Dashboard
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.number} className="card p-6">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent text-sm font-bold text-white">
                  {step.number}
                </span>
                <h2 className="text-lg font-bold text-brand-text">{step.title}</h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-brand-muted">{step.text}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}