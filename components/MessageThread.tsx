"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { sendMessage } from "@/app/actions/messaging";
import { timeAgo } from "@/lib/utils";

type Msg = { id: string; senderId: string; body: string; createdAt: string };

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Sending…" : "Send"}
    </button>
  );
}

export function MessageThread({
  engagementId,
  meId,
  otherName,
  active,
}: {
  engagementId: string;
  meId: string;
  otherName: string;
  active: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [state, action] = useFormState(sendMessage, null);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/engagements/${engagementId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      /* ignore transient network errors */
    }
  }, [engagementId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (state && state.ok) {
      formRef.current?.reset();
      load();
    }
  }, [state, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="card flex h-[28rem] flex-col p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-900">Messages</h2>
        <p className="text-xs text-slate-500">Private chat between you and {otherName}.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">
            No messages yet. Say hello and confirm the details.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-brand-100" : "text-slate-400"}`}>
                    {timeAgo(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {active ? (
        <form ref={formRef} action={action} className="flex items-end gap-2 border-t border-slate-200 p-3">
          <input type="hidden" name="engagementId" value={engagementId} />
          <textarea
            name="body"
            rows={1}
            placeholder="Type a message…"
            className="input flex-1 resize-none"
            required
          />
          <SendButton />
        </form>
      ) : (
        <div className="border-t border-slate-200 p-3 text-center text-sm text-slate-400">
          This engagement is closed.
        </div>
      )}
      {state && !state.ok && state.error && (
        <p className="px-3 pb-2 text-xs text-red-600">{state.error}</p>
      )}
    </div>
  );
}
