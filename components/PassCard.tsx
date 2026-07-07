import PassActions from "./PassActions";
import { createInquiryFromPass } from "../app/desk/actions";
import { extractGrowthPoint } from "../lib/prompts";
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
      ? `Компас: ${COMPASS_TITLES[pass.compassId] ?? pass.compassId}`
      : PASS_TYPE_LABELS[pass.type];

  const parsed = Array.isArray(pass.parsedResult) ? pass.parsedResult[0] : pass.parsedResult;
  const growthPoint =
    pass.status === "completed" && pass.type !== "inquiry" && parsed !== undefined
      ? extractGrowthPoint(parsed)
      : undefined;

  return (
    <details className="pass-card" open={defaultOpen}>
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
        <details>
          <summary>Депеша (промпт)</summary>
          <pre>{pass.promptText}</pre>
        </details>
        {pass.parsedResult !== undefined && (
          <details open={pass.status === "completed"}>
            <summary>{pass.type === "inquiry" ? "Справка секретаря" : "Диагноз наставника"}</summary>
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
        {growthPoint !== undefined && (
          <form action={createInquiryFromPass}>
            <input type="hidden" name="passId" value={pass.id} />
            <button type="submit" className="inquiry-button">
              Отправить секретаря за справкой
            </button>
          </form>
        )}
      </div>
    </details>
  );
}

// Как показывать секции ответа (ТЗ v1 §7): «беречь» — душа текста (эмеральд),
// «менять» — направление правки, остальное — обычным блоком.
// Неизвестные ключи (старые проходы) отрисовываются как есть.
const SECTION_LABELS: Record<string, string> = {
  диагноз: "Диагноз",
  беречь: "Что беречь — душа текста",
  менять: "Что менять",
  "точка роста": "Точка роста",
};

function ParsedResult({ result }: { result: Record<string, string> | Record<string, string>[] }) {
  const blocks = Array.isArray(result) ? result : [result];
  return (
    <>
      {blocks.map((block, blockIndex) => (
        <div key={blockIndex} className="pass-result">
          {Object.entries(block).map(([key, value]) => {
            const label = SECTION_LABELS[key] ?? key;
            const cls = key === "беречь" ? "section soul" : key === "менять" ? "section change" : "section";
            return (
              <div key={key} className={cls}>
                <p className="section-label">{label}</p>
                <p className="section-text">{value}</p>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
