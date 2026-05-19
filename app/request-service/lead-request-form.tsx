"use client";

import { useState } from "react";

type Service = {
  id: number;
  name: string;
};

type FormState = {
  customerName: string;
  phone: string;
  city: string;
  serviceId: string;
  description: string;
};

const initialState: FormState = {
  customerName: "",
  phone: "",
  city: "",
  serviceId: "",
  description: "",
};

type SubmissionState =
  | { status: "idle" }
  | { status: "success"; phone: string }
  | { status: "error"; message: string };

export function LeadRequestForm({ services }: { services: Service[] }) {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormState(initialState);
    setSubmissionState({ status: "idle" });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmissionState({ status: "idle" });

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        if (response.status === 409) {
          setSubmissionState({
            status: "error",
            message: "You've already submitted a request for this service with this phone number. Try a different service or use a different number.",
          });
          return;
        }

        setSubmissionState({
          status: "error",
          message: payload.message ?? "Something went wrong. Please try again.",
        });
        return;
      }

      setSubmissionState({ status: "success", phone: formState.phone });
      setFormState(initialState);
    } catch {
      setSubmissionState({
        status: "error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionState.status === "success") {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-brand-border bg-white px-6 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-success/10 text-brand-success" aria-hidden="true">
          <SuccessIcon />
        </span>
        <h2 className="mt-5 text-2xl font-bold text-brand-text">Request Submitted!</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-brand-muted">
          3 providers have been notified and will contact you shortly on {submissionState.phone}.
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="button-primary mt-6 inline-flex h-12 items-center justify-center px-6 text-sm font-semibold"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      {submissionState.status === "error" ? (
        <div className="rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-3 text-sm font-medium text-brand-danger">
          {submissionState.message}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" htmlFor="customerName">
          <input
            id="customerName"
            required
            value={formState.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            className="input-base h-11"
            type="text"
            name="customerName"
            placeholder="e.g. Ravi Sharma"
          />
        </Field>

        <Field label="Phone Number" htmlFor="phone">
          <input
            id="phone"
            required
            value={formState.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className="input-base h-11"
            type="tel"
            name="phone"
            placeholder="10-digit mobile number"
          />
          <p className="text-xs text-brand-muted">We&apos;ll share this with matched providers only.</p>
        </Field>
      </div>

      <Field label="City" htmlFor="city">
        <input
          id="city"
          required
          value={formState.city}
          onChange={(event) => updateField("city", event.target.value)}
          className="input-base h-11"
          type="text"
          name="city"
          placeholder="e.g. Bhopal, Indore, Mumbai"
        />
      </Field>

      <Field label="Service Required" htmlFor="serviceId">
        <select
          id="serviceId"
          required
          value={formState.serviceId}
          onChange={(event) => updateField("serviceId", event.target.value)}
          className="input-base h-11"
          name="serviceId"
        >
          <option value="">Select a service type</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
               {service.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Describe Your Problem" htmlFor="description">
        <textarea
          id="description"
          required
          rows={4}
          value={formState.description}
          onChange={(event) => updateField("description", event.target.value)}
          className="input-base min-h-28 resize-y"
          name="description"
          placeholder="Briefly describe the issue. e.g. &apos;Bathroom tap leaking since 2 days, needs urgent fix&apos;"
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="button-accent inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-sm font-semibold disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Spinner />
            <span>Finding providers...</span>
          </>
        ) : (
          <span>Find Providers for Me -&gt;</span>
        )}
      </button>

      <p className="text-xs leading-6 text-brand-muted">
        Your request will be matched with 3 providers. One call from each - no spam, no sharing with others.
      </p>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-brand-text" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden="true"
    />
  );
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4 4 10-10" />
    </svg>
  );
}
