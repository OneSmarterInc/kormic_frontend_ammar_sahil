import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Loader2, MessageCircle, Send, Bot, User, RefreshCw, AlertCircle } from "lucide-react";

import Button from "./Button";
import { Input } from "./Input";

/** Renders `**bold**` spans within a line of otherwise-plain text. */
function renderInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/** A markdown table row: cells trimmed, outer pipes stripped. */
function parseTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((c) => c.trim());
}

const isSeparatorRow = (cells) => cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));

/** Categorizes a line as "table" or "list" so blank lines between two lines of the same
 * kind (a common quirk in agent output) can be collapsed before block-parsing. */
function lineCategory(line) {
  const t = line.trim();
  if (t.startsWith("|")) return "table";
  if (/^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t)) return "list";
  return null;
}

function collapseStrayBlankLines(content) {
  const lines = content.split("\n");
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      const prevCategory = lineCategory(result[result.length - 1] || "");
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      const nextCategory = lineCategory(lines[j] || "");
      if (prevCategory && prevCategory === nextCategory) continue;
    }
    result.push(line);
  }
  return result.join("\n");
}

/**
 * Lightweight markdown-ish formatter for agent replies: turns "**bold**", "# headings",
 * "- "/"1. " lists, "---" rules, and "| a | b |" tables into real elements instead of
 * showing the raw symbols. Not a full markdown parser — just enough to clean up what the
 * agent actually produces.
 */
function FormattedMessage({ content }) {
  const blocks = [];
  let list = null;
  let table = null;

  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  const flushTable = () => {
    if (table) blocks.push(table);
    table = null;
  };

  collapseStrayBlankLines(content).split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+\.\s+(.*)$/);
    const isRule = /^(-{3,}|\*{3,}|_{3,})$/.test(trimmedLine);
    const isTableRow = trimmedLine.startsWith("|") && trimmedLine.length > 1;

    if (isTableRow) {
      const cells = parseTableRow(trimmedLine);
      if (table && table.rows.length === 1 && !table.hasHeader && isSeparatorRow(cells)) {
        table.hasHeader = true;
      } else {
        if (!table) {
          flushList();
          table = { type: "table", rows: [], hasHeader: false };
        }
        table.rows.push(cells);
      }
      return;
    }
    flushTable();

    if (isRule) {
      flushList();
      blocks.push({ type: "hr" });
    } else if (heading) {
      flushList();
      blocks.push({ type: "heading", text: heading[2] });
    } else if (bullet) {
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(bullet[1]);
    } else if (ordered) {
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ordered[1]);
    } else if (trimmedLine === "") {
      flushList();
    } else {
      flushList();
      blocks.push({ type: "text", text: line });
    }
  });
  flushList();
  flushTable();

  return blocks.map((block, i) => {
    if (block.type === "heading") {
      return (
        <p key={i} className="mb-1 mt-2 font-semibold first:mt-0">
          {renderInline(block.text, i)}
        </p>
      );
    }
    if (block.type === "hr") {
      return <hr key={i} className="my-2 border-ink-200" />;
    }
    if (block.type === "ul") {
      return (
        <ul key={i} className="my-1 list-disc space-y-0.5 pl-5">
          {block.items.map((item, j) => (
            <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
          ))}
        </ul>
      );
    }
    if (block.type === "ol") {
      return (
        <ol key={i} className="my-1 list-decimal space-y-0.5 pl-5">
          {block.items.map((item, j) => (
            <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
          ))}
        </ol>
      );
    }
    if (block.type === "table") {
      const [headerRow, ...bodyRows] = block.hasHeader
        ? block.rows
        : [null, ...block.rows];

      return (
        <div key={i} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            {headerRow && (
              <thead>
                <tr>
                  {headerRow.map((cell, c) => (
                    <th
                      key={c}
                      className="border border-ink-200 bg-ink-50 px-2 py-1 text-left font-semibold"
                    >
                      {renderInline(cell, `${i}-h-${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border border-ink-100 px-2 py-1 align-top">
                      {renderInline(cell, `${i}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <p key={i} className="mb-1 last:mb-0">
        {renderInline(block.text, i)}
      </p>
    );
  });
}

export default function ChatThread({
  messages = [],
  agentName = 'University assistant',
  sendError,
  onRetry,
  suggestions = [],
  onSend,
  loading = false,
  activityLabel = 'Thinking…',
  placeholder = "Type your message...",
  emptyTitle = "Start a conversation",
  emptyDescription = "",
  compact = false,
  heightClass,
  renderMessageExtras,
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const question = draft.trim();
    if (!question || loading) return;

    setDraft("");
    await onSend(question);
  };

  const hasMessages = messages.length > 0;

  const finalHeightClass =
    heightClass || (compact ? "h-[420px] max-h-[70vh]" : "h-[560px] max-h-[75vh]");

  return (
    <div className={clsx("flex min-h-0 flex-col bg-slate-50/60", finalHeightClass)}>
      <div
        ref={scrollRef}
        className={clsx(
          "min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8",
          hasMessages ? "space-y-6" : "flex items-center justify-center"
        )}
      >
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
              <Bot className="h-6 w-6 text-brand-600" />
            </div>

            <p className="text-sm font-semibold text-ink-900">
              {emptyTitle}
            </p>

            {emptyDescription && (
              <p className="mt-1.5 text-xs text-ink-500">
                {emptyDescription}
              </p>
            )}
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={clsx(
                "flex gap-3",
                message.role === "assistant" ? "justify-start" : "justify-end"
              )}
            >
              {message.role === 'assistant' && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Bot size={18}/></div>}
              <div
                className={clsx(
                  "max-w-[88%] sm:max-w-[80%] break-words rounded-2xl px-5 py-4 text-sm leading-7",
                  message.role === "assistant"
                    ? "border border-slate-200 bg-white text-ink-800 shadow-sm"
                    : "whitespace-pre-wrap bg-brand-600 text-white",
                  message.tone === "warning" && "bg-amber-50 text-amber-700"
                )}
              >
                <div className={clsx("mb-2 flex items-center gap-2 text-xs font-semibold", message.role === 'assistant' ? 'text-brand-600' : 'text-white/80')}>
                  {message.role === 'assistant' ? agentName : 'You'}
                </div>
                {message.role === "assistant" ? (
                  <FormattedMessage content={message.content} />
                ) : (
                  message.content
                )}
                {message.role === 'assistant' && renderMessageExtras?.(message)}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-ink-100 px-4 py-2 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span role="status" aria-live="polite">{activityLabel}</span>
            </div>
          </div>
        )}
      </div>

      {sendError && <div role="alert" className="mx-4 mb-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0"/><div className="flex-1"><p className="font-semibold">The reply could not be completed</p><p className="mt-1">{sendError}</p></div><button type="button" disabled={loading} onClick={onRetry} className="flex items-center gap-1 font-semibold disabled:opacity-50"><RefreshCw size={15}/>Retry</button></div>}
      {!hasMessages && suggestions.length > 0 && <div className="flex flex-wrap justify-center gap-2 px-5 pb-5">{suggestions.map(text => <button type="button" disabled={loading} key={text} onClick={()=>onSend(text)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-ink-700 hover:border-brand-300 hover:bg-brand-50">{text}</button>)}</div>}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-ink-100 bg-white p-3"
      >
        <div className="flex items-center gap-2">
          <textarea
            aria-label="Message your university agent"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {if(e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault(); handleSubmit(e);}}}
            placeholder={placeholder}
            className="min-h-[64px] max-h-40 flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />

          <Button
            type="submit"
            icon={Send}
            loading={loading}
            disabled={loading || !draft.trim()}
          >
            Send
          </Button>
        </div>
        <p className="mt-2 px-1 text-xs text-ink-400">Enter to send · Shift+Enter for a new line · Changes require your confirmation</p>
      </form>
    </div>
  );
}
