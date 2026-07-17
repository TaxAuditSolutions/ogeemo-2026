"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function OgeemoChat() {
    const [query, setQuery] = useState("");
    const [answer, setAnswer] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const trimmed = query.trim();
        if (!trimmed) return;

        try {
            setIsLoading(true);
            setAnswer("");

            const response = await fetch('/api/ogeemo-assistant', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ question: trimmed }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Failed to get answer.");
            }

            setAnswer(data.answer || "No answer returned.");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Unknown error occurred.";
            setAnswer(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "1rem" }}>
            <h2>Ogeemo Assistant</h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
                <input
                    type="text"
                    placeholder="Ask a question about Ogeemo..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: 1, padding: "0.75rem" }}
                />
                <button type="submit" disabled={isLoading} style={{ padding: "0.75rem 1rem" }}>
                    {isLoading ? "Thinking..." : "Ask"}
                </button>
            </form>

            <div
                className="transition-all duration-200"
                style={{
                    marginTop: "1rem",
                    padding: "1.25rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    minHeight: 80,
                    background: "#fcfcfd",
                }}
            >
                {answer ? (
                    <div className="prose prose-sm max-w-none prose-p:mb-3 prose-p:last:mb-0 prose-p:leading-6 prose-ul:my-4 prose-ol:my-4 prose-ul:space-y-2 prose-ol:space-y-2 prose-li:leading-6 prose-li:my-1 prose-strong:text-foreground prose-code:text-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {answer}
                        </ReactMarkdown>
                    </div>
                ) : (
                    "Your answer will appear here."
                )}
            </div>
        </div>
    );
}