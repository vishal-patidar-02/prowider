"use client";

import { useEffect, useState } from "react";

type Lead = {
  leadId: number;
  customerName: string;
  phone: string;
  city: string;
  serviceId: number;
  serviceName: string;
  submittedAt: string;
};

type Provider = {
  id: number;
  name: string;
  quotaTotal: number;
  quotaUsed: number;
  quotaRemaining: number;
  leads: Lead[];
};

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Set<number>>(new Set());

  useEffect(() => {
    const eventSource = new EventSource("/api/dashboard/stream");

    eventSource.onopen = () => {
      setIsLive(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: Provider[] = JSON.parse(event.data);
        setProviders(data);
      } catch (error) {
        console.error("Failed to parse SSE data:", error);
      }
    };

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        setIsLive(false);
      }
    };

    return () => {
      setIsLive(false);
      eventSource.close();
    };
  }, []);

  const toggleExpanded = (providerId: number) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  return (
    <main className="surface px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-brand-text">
              Operations Hub
            </h1>
            <p className="mt-2 text-sm text-brand-muted">
              Real-time provider allocation &amp; lead tracking
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full border border-brand-border bg-brand-card px-3 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-brand-success/60" />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isLive ? "bg-brand-success" : "bg-brand-muted"}`} />
            </span>
            <span className="text-xs font-semibold text-brand-text">
              {isLive ? "LIVE" : "Connecting"}
            </span>
          </div>
        </div>

        {providers.length === 0 ? (
          <div className="card flex items-center justify-center rounded-2xl border-dashed p-12 text-center">
            <p className="text-brand-muted">Connecting to live stream...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <article
                key={provider.id}
                className="card overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="border-b border-brand-border p-5">
                  <h2 className="font-bold text-brand-text">
                    <span style={{ color: '#64748B', fontSize: '0.8em', fontWeight: 500 }}>
                      (Provider {provider.id})
                    </span>
                    {' '}{provider.name}
                  </h2>

                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                        <span className="uppercase tracking-wide text-brand-muted">Monthly quota</span>
                        <span className="text-brand-text">
                          {provider.quotaRemaining} / {provider.quotaTotal}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-brand-border">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-brand-primary to-brand-accent transition-all"
                          style={{
                            width: `${Math.min(100, (provider.quotaUsed / provider.quotaTotal) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg bg-brand-surface p-2.5 text-xs">
                      <p className="text-brand-muted">This month assigned:</p>
                      <p className="mt-1 font-bold text-brand-primary">
                        {provider.quotaUsed} leads
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(provider.id)}
                    className="flex w-full items-center justify-between rounded-lg bg-brand-surface px-3 py-2.5 text-xs font-semibold text-brand-text hover:bg-brand-border transition-colors"
                  >
                    <span className="uppercase tracking-wide">Leads assigned ({provider.leads.length})</span>
                    <span className={`transition-transform ${expandedProviders.has(provider.id) ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>

                  {expandedProviders.has(provider.id) && (
                    <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                      {provider.leads.length === 0 ? (
                        <p className="text-xs text-brand-muted italic py-4 text-center">No leads assigned this month</p>
                      ) : (
                        provider.leads.map((lead) => (
                          <div
                            key={lead.leadId}
                            className="rounded-lg border border-brand-border bg-brand-surface p-3 text-xs"
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <span className="font-semibold text-brand-text flex-1">
                                {lead.customerName}
                              </span>
                              <span className="badge-pill shrink-0 bg-brand-primary/10 text-brand-primary text-xs">
                                <span style={{ color: '#64748B', fontSize: '0.75em', fontWeight: 500 }}>
                                  (Service {lead.serviceId})
                                </span>
                                {' '}{lead.serviceName}
                              </span>
                            </div>
                            <div className="space-y-1 text-brand-muted">
                              <p>ID: {lead.leadId}</p>
                              <p>{lead.city} • {lead.phone}</p>
                              <p className="text-xs text-brand-muted/70">
                                {new Date(lead.submittedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
