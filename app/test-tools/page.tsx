"use client";

import { useEffect, useMemo, useState } from "react";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4 4 10-10" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l9.5 17.5H2.5L12 2z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

type Provider = {
  id: number;
  name: string;
};

type LeadResponse = {
  message?: string;
  assignedProviders?: Array<{ id: number; name: string }>;
};

type ConcurrencyResult = {
  status: number;
  message: string;
  serviceId: number;
  phone: string;
};

export default function TestToolsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [providerFeedback, setProviderFeedback] = useState<string>("");
  const [idempotencyLogs, setIdempotencyLogs] = useState<string[]>([]);
  const [concurrencyResults, setConcurrencyResults] = useState<ConcurrencyResult[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [isSubmittingIdempotency, setIsSubmittingIdempotency] = useState(false);
  const [isSubmittingConcurrency, setIsSubmittingConcurrency] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch("/api/providers");
        const data = (await response.json()) as Provider[];

        if (response.ok) {
          setProviders(data);
        } else {
          setProviderFeedback(data && typeof data === "object" && "message" in data ? String((data as { message?: string }).message) : "Unable to load providers.");
        }
      } catch (error) {
        setProviderFeedback(error instanceof Error ? error.message : "Unable to load providers.");
      } finally {
        setIsLoadingProviders(false);
      }
    };

    void loadProviders();
  }, []);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === Number(selectedProviderId)),
    [providers, selectedProviderId],
  );

  const postResetWebhook = async (eventId: string, providerId: number) => {
    const response = await fetch("/api/webhook/reset-quota", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId, providerId }),
    });

    const payload = (await response.json()) as LeadResponse;

    return {
      status: response.status,
      message: payload.message ?? "No response message.",
    };
  };

  const runResetOnce = async () => {
    if (!selectedProvider) {
      setProviderFeedback("⚠️ Please select a provider first.");
      return;
    }

    setIsSubmittingReset(true);
    setProviderFeedback("");

    try {
      const result = await postResetWebhook(
        `reset-${selectedProvider.id}-${Date.now()}`,
        selectedProvider.id,
      );

      if (result.status === 200 && result.message === "quota reset") {
        setProviderFeedback(`Quota reset for (Provider ${selectedProvider.id}) ${selectedProvider.name}`);
      } else {
        setProviderFeedback(result.message);
      }
    } catch (error) {
      setProviderFeedback(error instanceof Error ? error.message : "Quota reset failed.");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const runIdempotencyTest = async () => {
    if (!selectedProvider) {
      setIdempotencyLogs(["⚠️ Please select a provider first."]);
      return;
    }

    setIsSubmittingIdempotency(true);
    setIdempotencyLogs([]);

    try {
      const nextLogs: string[] = [];
      const eventId = `idempotency-test-provider-${selectedProvider.id}-${Date.now()}`;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const result = await postResetWebhook(eventId, selectedProvider.id);
        nextLogs.push(`Call ${attempt}: ${result.message} (HTTP ${result.status})`);
      }

      setIdempotencyLogs(nextLogs);
    } catch (error) {
      setIdempotencyLogs([error instanceof Error ? error.message : "Idempotency test failed."]);
    } finally {
      setIsSubmittingIdempotency(false);
    }
  };

  const runConcurrencyTest = async () => {
    setIsSubmittingConcurrency(true);
    setConcurrencyResults([]);

    try {
      const leads = Array.from({ length: 10 }, (_, index) => ({
        customerName: `Test User ${index + 1}`,
        phone: `99${Date.now().toString().slice(-6)}${String(index + 1).padStart(2, "0")}`,
        city: "Bhopal",
        serviceId: (index % 3) + 1,
        description: `Concurrent test lead ${index + 1}`,
      }));

      const results = await Promise.all(
        leads.map(async (lead) => {
          const response = await fetch("/api/leads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(lead),
          });

          const payload = (await response.json()) as LeadResponse;

          return {
            status: response.status,
            message:
              payload.message ??
              (response.ok ? "Lead created successfully." : "Request failed."),
            serviceId: lead.serviceId,
            phone: lead.phone,
          } satisfies ConcurrencyResult;
        }),
      );

      setConcurrencyResults(results);
    } catch (error) {
      setConcurrencyResults([
        {
          status: 0,
          message: error instanceof Error ? error.message : "Concurrency test failed.",
          serviceId: 0,
          phone: "",
        },
      ]);
    } finally {
      setIsSubmittingConcurrency(false);
    }
  };

  const concurrencySuccessCount = concurrencyResults.filter((result) => result.status === 201).length;
  const concurrencyFailureResults = concurrencyResults.filter((result) => result.status !== 201);

  return (
    <main className="surface px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.24em] font-semibold text-brand-muted">
            QA Test Tools
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">
            Verify System Behavior
          </h1>
          <p className="mt-3 text-sm leading-6 text-brand-muted">
            Test quota reset, webhook idempotency, and concurrent lead allocation fairness using these tools.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <ToolButton
            label="Reset Quota"
            description="Test provider quota reset for the current month."
            onClick={runResetOnce}
            disabled={isSubmittingReset || isLoadingProviders}
          />
          <ToolButton
            label="Idempotency Check"
            description="Call the same webhook 5 times with one event ID."
            onClick={runIdempotencyTest}
            disabled={isSubmittingIdempotency || isLoadingProviders}
          />
          <ToolButton
            label="Concurrent Leads"
            description="Submit 10 leads simultaneously across all services."
            onClick={runConcurrencyTest}
            disabled={isSubmittingConcurrency}
          />
        </div>

        <div className="card grid gap-4 p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-bold text-brand-text">
              <span className="flex items-center gap-2">
                {!selectedProviderId && <span className="inline-flex h-2 w-2 rounded-full bg-brand-danger animate-pulse" aria-hidden="true" />}
                Select provider 
              </span>
              <select
                value={selectedProviderId}
                onChange={(event) => {
                  setSelectedProviderId(event.target.value);
                  if (event.target.value) {
                    setProviderFeedback("");
                    setIdempotencyLogs([]);
                  }
                }}
                className={`input-base h-11 ${!selectedProviderId ? "border-brand-danger/50 bg-brand-danger/5" : ""}`}
                disabled={isLoadingProviders}
              >
                <option value="">Select a provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    (Provider {provider.id}) {provider.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-xs font-medium text-brand-muted">
              {isLoadingProviders ? "Loading..." : `${providers.length} providers loaded`}
            </div>
          </div>

          {providerFeedback ? (
            <div className={`rounded-lg border px-3 py-2 text-sm font-medium flex items-start gap-2 ${
              providerFeedback.includes("⚠️") 
                ? "border-brand-danger/20 bg-brand-danger/10 text-brand-danger"
                : "border-brand-success/20 bg-brand-success/10 text-brand-success"
            }`}>
              {providerFeedback.includes("⚠️") ? <AlertIcon /> : <CheckIcon />}
              <span>{providerFeedback}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <h2 className="font-semibold text-brand-text tracking-tight">
            Webhook Idempotency Log
          </h2>

          {idempotencyLogs.length === 0 ? (
            <div className="card border-dashed p-8 text-center text-sm text-brand-muted">
              Run the idempotency check above to see webhook responses here.
            </div>
          ) : (
            <div className="card space-y-2 p-4">
              {idempotencyLogs.map((entry, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg px-3 py-2 text-xs font-mono flex items-start gap-2 ${
                    entry.includes("⚠️")
                      ? "border border-brand-danger/20 bg-brand-danger/10 text-brand-danger"
                      : "bg-brand-surface text-brand-text"
                  }`}
                >
                  {entry.includes("⚠️") && <AlertIcon />}
                  <span>{entry}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <h2 className="font-semibold text-brand-text tracking-tight">
            Concurrency Results
          </h2>

          {concurrencyResults.length === 0 ? (
            <div className="card border-dashed p-8 text-center text-sm text-brand-muted">
              Run the concurrent leads test to see results here.
            </div>
          ) : (
            <div className="card grid gap-4 p-6">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-brand-success/10 p-3">
                  <p className="text-xs text-brand-muted uppercase tracking-wide font-semibold">Successful</p>
                  <p className="mt-2 text-2xl font-bold text-brand-success">{concurrencySuccessCount}</p>
                </div>
                <div className="rounded-lg bg-brand-danger/10 p-3">
                  <p className="text-xs text-brand-muted uppercase tracking-wide font-semibold">Failed</p>
                  <p className="mt-2 text-2xl font-bold text-brand-danger">{concurrencyFailureResults.length}</p>
                </div>
              </div>

              {concurrencyFailureResults.length > 0 ? (
                <div className="grid gap-2 rounded-lg bg-brand-danger/10 p-3 border border-brand-danger/20">
                  <p className="font-semibold text-brand-danger flex items-center gap-2 text-sm">
                    <AlertIcon />
                    Failures
                  </p>
                  {concurrencyFailureResults.map((result, index) => (
                    <p key={`${result.phone}-${index}`} className="text-xs text-brand-danger/80 font-mono">
                      Service {result.serviceId}, {result.phone}: {result.message}
                    </p>
                  ))}
                </div>
              ) : null}

              <p className="text-xs text-brand-muted italic">
                Check the Operations Hub to verify fair allocation.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ToolButton({
  label,
  description,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  onClick: () => Promise<void>;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-40 flex-col justify-between rounded-xl border border-brand-border bg-brand-primary px-5 py-5 text-left text-white transition hover:shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="font-semibold leading-6">{label}</span>
      <span className="mt-4 text-xs leading-5 text-white/80">
        {description}
      </span>
    </button>
  );
}