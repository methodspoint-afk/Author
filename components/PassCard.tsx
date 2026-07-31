import PassActions from "./PassActions";
import { COMPASS_TITLES, PASS_STATUS_LABELS, PASS_TYPE_LABELS } from "../lib/passMeta";
import type { Pass } from "../lib/types";

const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export default function PassCard({ pass, defaultOpen }: { pass: Pass; defaultOpen: boolean }) {
  const title =
    pass.type === "mentor-compass" && pass.compassId !== undefined
      ? `Наставник: ${COMPASS_TITLES[pass.compassId] ?? pass.compassId}`
      : PASS_TYPE_LABELS[pass.type];

  // Завершённые проходы свёрнуты по умолчанию — разбор не «висит колбасой»
  // поверх работы. Раскрыт только активный (черновик/у наставника) последний.
  const open = defaultOpen && pass.status !== "completed";

  return (
    <details className="pass-card" open={open}>
      <summary>
        {title}{" "}
        <span className="pass-status" data-status={pass.status}>
          · {PASS_STATUS_LABELS[pass.status]}
          {pass.completedAt !== undefined &&
            ` · ${dateTimeFormat.format(new Date(pass.completedAt))}`}
        </span>
      </summary>
      <div className="pass-body">
        {pass.intention !== undefined && <p>Намерение: {pass.intention}</p>}
        {pass.inquiryTopic !== undefined && <p>Тема изыскания: {pass.inquiryTopic}</p>}
        {/* Промпт пользователю не показываем — только кнопка «Скопировать» в PassActions. */}
        {pass.parsedResult !== undefined && (
          <details open={pass.status === "completed"}>
            <summary>{pass.type === "inquiry" ? "Справка" : "Разбор"}</summary>
            <ParsedResult result={pass.parsedResult} />
          </details>
        )}
        {pass.rawResponse !== undefined && (
          <details>
            <summary>Ответ целиком</summary>
            <pre>{pass.rawResponse}</pre>
          </details>
        )}
        <PassActions
          passId={pass.id}
          status={pass.status}
          promptText={pass.promptText}
          {...(pass.lastParseFailed !== undefined && { lastParseFailed: pass.lastParseFailed })}
        />
      </div>
    </details>
  );
}

function ParsedResult({ result }: { result: Record<string, string> | Record<string, string>[] }) {
  const blocks = Array.isArray(result) ? result : [result];
  return (
    <>
      {blocks.map((block, blockIndex) => (
        <dl key={blockIndex} className="pass-result">
          {Object.entries(block).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ))}
    </>
  );
}
