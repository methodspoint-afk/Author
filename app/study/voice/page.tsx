import Link from "next/link";
import PassCard from "../../../components/PassCard";
import ProgressDots from "../../../components/ProgressDots";
import { getAllPasses, getNotebooks } from "../../../lib/data";
import { AUTHOR_VOICE_MIN_TEXTS, fullyCycledNotebooks } from "../../../lib/voice";
import { startAuthorVoice } from "../../desk/actions";

export const dynamic = "force-dynamic";

export default async function VoicePage() {
  const [notebooks, passes] = await Promise.all([getNotebooks(), getAllPasses()]);

  const cycled = fullyCycledNotebooks(notebooks, passes).length;
  const eligible = cycled >= AUTHOR_VOICE_MIN_TEXTS;

  const active = passes.find((pass) => pass.type === "author-voice" && pass.status !== "completed");
  const done = passes
    .filter((pass) => pass.type === "author-voice" && pass.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  // Прежние «Сверки голоса» (тип audit) — механику убрали (одна сущность голоса),
  // но старые сверки автора не прячем: показываем свёрнутой историей.
  const oldChecks = passes
    .filter((pass) => pass.type === "audit" && pass.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return (
    <>
      <p className="back-link">
        <Link href="/study">← Кабинет</Link>
      </p>
      <h1>Голос</h1>
      <p className="empty-note">
        Портрет — качественный, не численный: словами и примерами, не графиками. Замеры по
        осям каждого наставника — в <Link href="/study/mentors">Наставниках</Link>; движение
        одного текста через версии — в «Разборе роста» внутри тетради.
      </p>

      <h2>Голос автора</h2>
      <p className="empty-note">
        Секретарь смотрит не на один текст, а на несколько ваших законченных — и называет,
        что в голосе уже звучит уверенно, а что ещё колеблется от текста к тексту. Открывается,
        когда <strong>{AUTHOR_VOICE_MIN_TEXTS} разных текста пройдут полный круг</strong> (Не
        высушить → две Сверки → Усилить → правка).
      </p>

      {cycled >= 1 && (
        <p className="progress-line">
          <ProgressDots
            filled={Math.min(cycled, AUTHOR_VOICE_MIN_TEXTS)}
            total={AUTHOR_VOICE_MIN_TEXTS}
            label={`полный круг прошли: ${cycled} из ${AUTHOR_VOICE_MIN_TEXTS}`}
          />
          <span>
            Полный круг прошли: {Math.min(cycled, AUTHOR_VOICE_MIN_TEXTS)} из{" "}
            {AUTHOR_VOICE_MIN_TEXTS}
          </span>
        </p>
      )}

      {active !== undefined ? (
        <div className="pass-list inquiries-list">
          <PassCard pass={active} defaultOpen />
        </div>
      ) : eligible ? (
        <div className="lens-block audit-block">
          <p>Секретарь соберёт портрет голоса по финальным версиям этих текстов.</p>
          <form action={startAuthorVoice}>
            <button type="submit" className="toolbar-button">
              Собрать голос автора
            </button>
          </form>
        </div>
      ) : (
        <p className="empty-note">
          Как {AUTHOR_VOICE_MIN_TEXTS} текста пройдут полный круг — секретарь соберёт портрет
          голоса. Спешки нет.
        </p>
      )}

      {done.length > 0 && (
        <>
          <h2>Прежние портреты</h2>
          <div className="pass-list inquiries-list">
            {done.map((pass) => (
              <PassCard key={pass.id} pass={pass} defaultOpen={false} />
            ))}
          </div>
        </>
      )}

      {oldChecks.length > 0 && (
        <details className="voice-core">
          <summary>Прежние сверки голоса</summary>
          <div className="pass-list inquiries-list">
            {oldChecks.map((pass) => (
              <PassCard key={pass.id} pass={pass} defaultOpen={false} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}
