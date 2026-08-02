import PassActions from "./PassActions";
import {
  COMPASS_TITLES,
  PASS_STATUS_LABELS,
  PASS_STATUS_LABELS_INQUIRY,
  PASS_TYPE_LABELS,
} from "../lib/passMeta";
import type { AxisAssessment, Pass } from "../lib/types";

const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export default function PassCard({ pass, defaultOpen }: { pass: Pass; defaultOpen: boolean }) {
  const isInquiry = pass.type === "inquiry";
  const title =
    pass.type === "mentor-compass" && pass.compassId !== undefined
      ? `Наставник: ${COMPASS_TITLES[pass.compassId] ?? pass.compassId}`
      : PASS_TYPE_LABELS[pass.type];
  const statusLabel = isInquiry
    ? PASS_STATUS_LABELS_INQUIRY[pass.status]
    : PASS_STATUS_LABELS[pass.status];

  // Завершённые проходы свёрнуты по умолчанию — разбор не «висит колбасой»
  // поверх работы. Раскрыт только активный (черновик/у наставника) последний.
  const open = defaultOpen && pass.status !== "completed";

  return (
    <details className="pass-card" open={open}>
      <summary>
        {title}{" "}
        <span className="pass-status" data-status={pass.status}>
          · {statusLabel}
          {pass.completedAt !== undefined &&
            ` · ${dateTimeFormat.format(new Date(pass.completedAt))}`}
        </span>
      </summary>
      <div className="pass-body">
        {pass.intention !== undefined && <p>Намерение: {pass.intention}</p>}
        {pass.inquiryTopic !== undefined && <p>Тема изыскания: {pass.inquiryTopic}</p>}
        {/* Промпт пользователю не показываем — только кнопка «Скопировать» в PassActions. */}
        {pass.axisResult !== undefined && pass.axisResult.length > 0 ? (
          <details open={pass.status === "completed"}>
            <summary>Разбор по осям</summary>
            <AxisReview
              axes={pass.axisResult}
              main={pickField(pass.parsedResult, "точка роста")}
              exercise={pickField(pass.parsedResult, "упражнение")}
            />
          </details>
        ) : (
          pass.parsedResult !== undefined && (
            <details open={pass.status === "completed"}>
              <summary>{pass.type === "inquiry" ? "Справка" : "Разбор"}</summary>
              <ParsedResult result={pass.parsedResult} />
            </details>
          )
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
          isInquiry={isInquiry}
          {...(pass.lastParseFailed !== undefined && { lastParseFailed: pass.lastParseFailed })}
        />
      </div>
    </details>
  );
}

// Достаёт поле из parsedResult (объект или массив блоков).
function pickField(
  result: Record<string, string> | Record<string, string>[] | undefined,
  key: string,
): string {
  const block = Array.isArray(result) ? result[0] : result;
  return block?.[key] ?? "";
}

function AxisRow({ axis }: { axis: AxisAssessment }) {
  return (
    <div className="axis-line" data-state={axis.state}>
      <p className="axis-head">
        <span className="axis-tag">{axis.state}</span>
        {/* имя оси автору не показываем — только нейтральный «фокус» */}
        {axis.focus !== undefined && axis.focus !== "" && <span>{axis.focus}</span>}
      </p>
      {axis.seen !== "" && <p className="axis-seen">{axis.seen}</p>}
      {axis.step !== "" && <p className="axis-step">{axis.step}</p>}
    </div>
  );
}

// Отбор для показа: приоритетные, если наставник их пометил; иначе — по факту.
// Зоны роста — до 3, сильная сторона — 1 (та, что ближе к намерению).
function pickShown(axes: AxisAssessment[], state: AxisAssessment["state"], limit: number) {
  const all = axes.filter((axis) => axis.state === state);
  const pri = all.filter((axis) => axis.priority === true);
  return (pri.length > 0 ? pri : all).slice(0, limit);
}

// Разбор по осям: сверху «Главное», затем 2–3 зоны роста (конвертируют намерение),
// затем одна сильная сторона под «Что уже работает». Оси «в норме» скрыты. Каждая
// ось заканчивается шагом-вопросом. Внизу — упражнение в копилку.
function AxisReview({
  axes,
  main,
  exercise,
}: {
  axes: AxisAssessment[];
  main: string;
  exercise: string;
}) {
  const growth = pickShown(axes, "зона роста", 3);
  const strengths = pickShown(axes, "сильная сторона", 1);
  return (
    <div className="axis-review">
      {main !== "" && (
        <div className="axis-main">
          <span className="axis-main-tag">Главное</span>
          <p>{main}</p>
        </div>
      )}
      {growth.map((axis) => (
        <AxisRow key={axis.key} axis={axis} />
      ))}
      {strengths.length > 0 && (
        <>
          <p className="axis-subhead">Что уже работает</p>
          {strengths.map((axis) => (
            <AxisRow key={axis.key} axis={axis} />
          ))}
        </>
      )}
      {exercise !== "" && (
        <div className="axis-exercise">
          <span className="axis-exercise-tag">Упражнение</span>
          <p className="axis-exercise-text">{exercise}</p>
          <p className="axis-exercise-note">В копилку — по желанию, вне этого текста.</p>
        </div>
      )}
    </div>
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
