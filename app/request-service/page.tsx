import { prisma } from "@/lib/prisma";
import { runWithPrismaRetry } from "@/lib/prisma-retry";
import { LeadRequestForm } from "./lead-request-form";

export const dynamic = "force-dynamic";

export default async function RequestServicePage() {
  const services = await runWithPrismaRetry(() =>
    prisma.service.findMany({
      orderBy: {
        id: "asc",
      },
    }),
  );

  return (
    <main className="surface px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="card p-6 sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-muted">
            Request Service
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">
            Request a Service
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-brand-muted">
            Fill in your details and we&apos;ll connect you with 3 verified professionals in your area.
          </p>

          <div className="mt-8">
            <LeadRequestForm services={services} />
          </div>
        </div>

        <aside className="card h-fit p-6 sm:p-8 lg:p-10">
          <p className="text-sm font-semibold text-brand-primary">Why Prowider?</p>

          <div className="mt-6 grid gap-5">
            <TrustItem
              title="Verified Providers Only"
              text="Every provider is background-checked and rated by past customers."
            />
            <TrustItem
              title="Fair Matching, No Bias"
              text="Leads are distributed fairly using a rotation system - not based on who pays more."
            />
            <TrustItem
              title="Your Data Stays Private"
              text="Your contact details are only shared with the 3 matched providers."
            />
          </div>

          <div className="mt-8 rounded-2xl border border-brand-primary/10 bg-brand-primary/5 p-4 text-sm text-brand-primary">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-base" aria-hidden="true">⏱</span>
              <p>
                <span className="font-semibold">Average response time:</span> under 15 minutes
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function TrustItem({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-success/10 text-sm font-bold text-brand-success" aria-hidden="true">
        <CheckIcon />
      </span>
      <div>
        <p className="font-semibold text-brand-text">{title}</p>
        <p className="mt-1 text-sm leading-6 text-brand-muted">{text}</p>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4 4 10-10" />
    </svg>
  );
}
