"use client";

import { useActionState } from "react";
import { createInquiry, type ActionResult } from "../app/desk/actions";

export default function InquiryForm() {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    createInquiry,
    undefined,
  );

  return (
    <form action={formAction} className="lens-form inquiry-form">
      <label>
        О чём навести справки?
        <input
          type="text"
          name="topic"
          placeholder="например: как работает подтекст в короткой прозе"
          autoComplete="off"
          required
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Собираю депешу…" : "Отправить секретаря"}
      </button>
      {state?.error !== undefined && <p className="error-note">{state.error}</p>}
    </form>
  );
}
