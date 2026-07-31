"use client";

// Кнопка печати: открывает диалог браузера, где есть «Сохранить как PDF».
export default function PrintButton() {
  return (
    <button type="button" className="toolbar-button" onClick={() => window.print()}>
      Сохранить как PDF
    </button>
  );
}
