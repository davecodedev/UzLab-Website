"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function ContactPage() {
  const [type, setType] = useState<"CONTACT" | "FEEDBACK">("CONTACT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/contact", { type, name, email, message });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Contact & Feedback</h1>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <div>
          {submitted ? (
            <p className="text-black/70 dark:text-white/70">Thanks — we&apos;ll be in touch.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "CONTACT" | "FEEDBACK")}
                  className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
                >
                  <option value="CONTACT">General contact</option>
                  <option value="FEEDBACK">Feedback</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                Send
              </button>
            </form>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold">Find us</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Address and map details coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
