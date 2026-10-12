// ═══════════════════════════════════════════════════════════════
// PrintButton — Print and PDF export controls
// ═══════════════════════════════════════════════════════════════

export function PrintButton({ label = 'Print / PDF' }: { label?: string }) {
  function handlePrint() {
    window.print();
  }

  return (
    <button onClick={handlePrint} className="primary" title="Print or save as PDF via browser print dialog">
      🖨️ {label}
    </button>
  );
}
