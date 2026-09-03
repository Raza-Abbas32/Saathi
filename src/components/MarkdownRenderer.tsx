import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

/**
 * Preprocess raw text from AI models, handoffs, or user input to ensure CommonMark & GFM
 * parsers correctly render headings, lists, tables, callouts, and bold spans.
 * Avoids any aggressive regexes that eat newlines or mangle bold markers.
 */
function normalizeMarkdown(raw: string): string {
  if (!raw) return '';
  let text = String(raw).replace(/\\n/g, '\n');

  // 1. Strip outer code block if the entire response is wrapped in ```markdown ... ```
  text = text.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/gi, '$1');

  // 2. REPAIR BROKEN TABLE SEPARATORS (e.g. if :--- was split across lines into :\n\n---)
  text = text.replace(/\|\s*:\s*\n+\s*---\s*\|/g, '| :--- |');
  text = text.replace(/\|\s*:\s*\n+\s*---\s*/g, '| :--- ');
  text = text.replace(/\|\s*---\s*\n+\s*:\s*\|/g, '| ---: |');
  text = text.replace(/\|\s*---\s*\n+\s*:\s*/g, '| ---: ');
  text = text.replace(/\|\s*---\s*\n+\s*---\s*\|/g, '| --- |');
  text = text.replace(/\|\s*:\s*\n+\s*---\s*\n+\s*:\s*\|/g, '| :---: |');

  // 3. Ensure markdown tables have empty lines above and below for GFM parsing
  text = text.replace(/^\|\s*([^\s|])/gm, '| $1');
  text = text.replace(/([^\s|])\s*\|$/gm, '$1 |');
  text = text.replace(/([^|\n])\n(\|[^\n]+\|)/g, '$1\n\n$2');
  text = text.replace(/(\|[^\n]+\|)\n([^|\n])/g, '$1\n\n$2');

  // 4. Headings:
  // Ensure space after hashes: "####Heading" -> "#### Heading"
  text = text.replace(/^(#{1,6})([^#\s\n])/gm, '$1 $2');
  // If a heading was squished on the same line as previous text: "text#### Heading" -> "text\n\n#### Heading"
  text = text.replace(/([^\n#])\s+(#{1,6}\s+[^\n]+)/g, '$1\n\n$2');
  // Ensure headings have a blank line before them so they do not merge into previous paragraphs or blockquotes
  text = text.replace(/([^\n])\n(#{1,6}\s+)/g, '$1\n\n$2');

  // 5. Ensure standalone horizontal rules are separated by newlines
  text = text.replace(/(^[ \t]*[-*_]{3,}[ \t]*$)/gm, '\n$1\n');

  // 6. Fix bullet points with missing spaces (e.g. "•Item" or "•**" -> "• Item" or "• **")
  text = text.replace(/^([ \t]*[•–—-])([^\s\n•–—-])/gm, '$1 $2');

  // 7. Fix bold labels missing trailing space: "**Soil Type:**Clay" -> "**Soil Type:** Clay"
  text = text.replace(/\*\*([^*\n]+?:)\*\*([A-Za-z0-9\u0600-\u06FF])/g, '**$1** $2');

  // 8. Transform single-line tip asterisks (*💡 ... * or 💡 ... *) into clean callout blockquotes
  text = text.replace(/^[ \t]*\*?\s*💡\s*([^*]+?)\*?[ \t]*$/gm, '> 💡 **Tip:** $1');

  // 9. Normalize excessive consecutive empty lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export default function MarkdownRenderer({
  content,
  className = '',
  isUser = false,
}: MarkdownRendererProps) {
  const normalized = normalizeMarkdown(content);

  if (isUser) {
    return (
      <div className={`markdown-content max-w-none text-white ${className}`}>
        <Markdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-sm sm:text-base font-bold text-white mt-1.5 mb-1 pb-1 border-b border-white/20">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xs sm:text-sm font-bold text-white mt-1.5 mb-0.5">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xs sm:text-sm font-semibold text-white/95 mt-1.5 mb-0.5">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-xs sm:text-sm font-semibold text-white mt-1 mb-0.5">
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p className="leading-relaxed mb-1.5 text-xs sm:text-sm last:mb-0 text-white font-normal">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-4 space-y-0.5 mb-1.5 text-xs sm:text-sm marker:text-white/80">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-4 space-y-0.5 mb-1.5 text-xs sm:text-sm marker:text-white/80">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="leading-relaxed text-white">{children}</li>,
            strong: ({ children }) => (
              <strong className="font-bold text-white underline decoration-white/30 underline-offset-2">
                {children}
              </strong>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-white/60 bg-white/10 px-2.5 py-1 rounded-r my-1 text-xs text-white">
                {children}
              </blockquote>
            ),
          }}
        >
          {normalized}
        </Markdown>
      </div>
    );
  }

  return (
    <div className={`markdown-content max-w-none text-slate-900 ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-bold text-slate-950 mt-3 mb-2 flex items-center gap-2 border-b border-slate-100 pb-1.5 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-2.5 mb-1.5 flex items-center gap-1.5 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-semibold text-emerald-900 mt-2.5 mb-1.5 flex items-center gap-1.5 tracking-tight">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mt-2 mb-1 flex items-center gap-1.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed mb-2.5 text-xs sm:text-sm last:mb-0 text-slate-700 font-normal">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 mb-2.5 text-xs sm:text-sm marker:text-emerald-600 text-slate-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 mb-2.5 text-xs sm:text-sm marker:text-emerald-600 font-medium text-slate-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed font-normal text-slate-700">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 px-3.5 py-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 text-xs sm:text-sm font-medium shadow-2xs leading-relaxed">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-950">
              {children}
            </strong>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
              <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50/90 font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold text-slate-800 border-b border-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 border-t border-slate-100 text-slate-700 text-xs">
              {children}
            </td>
          ),
          hr: () => <hr className="my-3 border-t border-slate-200/80" />,
          code: ({ children }) => (
            <code className="bg-slate-100 text-emerald-800 px-1.5 py-0.5 rounded-md text-[85%] font-mono font-medium">
              {children}
            </code>
          ),
        }}
      >
        {normalized}
      </Markdown>
    </div>
  );
}


