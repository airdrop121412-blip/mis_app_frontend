// ═══════════════════════════════════════════════════════════════
// EpicadTemplateDoc — renders a user-designed EPICAD from an HTML
// template string with {{field}} / {{worker.field}} placeholders filled
// from the database.
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import type { EpFileData } from '../../types/ep';
import { fillTemplate, type CardSubject } from './epicadValues';

interface EpicadTemplateDocProps {
  template: string;
  data: EpFileData;
  /** Optional tenant / wage-labour worker the card is generated for. */
  subject?: CardSubject | null;
}

export function EpicadTemplateDoc({ template, data, subject }: EpicadTemplateDocProps) {
  const rendered = useMemo(() => fillTemplate(template, data, {}, subject), [template, data, subject]);

  // The uploaded template is a full HTML document (with <head>/<style>).
  // We extract the <style> content and the <body> markup so placeholders
  // render with the designer's exact CSS but scoped to our container.
  const parsed = useMemo(() => {
    const styleMatch = rendered.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const bodyMatch = rendered.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const css = styleMatch?.[1] ?? '';
    const body = bodyMatch?.[1] ?? rendered;
    return { css, body };
  }, [rendered]);

  return (
    <>
      <style>{parsed.css}</style>
      <div
        className="epicad-template-root"
        dangerouslySetInnerHTML={{ __html: parsed.body }}
      />
    </>
  );
}