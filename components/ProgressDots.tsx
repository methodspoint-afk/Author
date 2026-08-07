// Тихий прогресс (Q6, второй слой): точки-кружки к порогу — язык дизайна
// наставников (mentor-dot). Ненавязчиво, не «геймификация»: маленькие кружки
// у самого раздела. Серверный компонент — данных клиента не нужно.

export default function ProgressDots({
  filled,
  total,
  label,
}: {
  filled: number;
  total: number;
  label?: string;
}) {
  return (
    <span
      className="progress-dots"
      role="img"
      aria-label={label ?? `прогресс: ${filled} из ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="progress-dot" data-filled={i < filled} />
      ))}
    </span>
  );
}
