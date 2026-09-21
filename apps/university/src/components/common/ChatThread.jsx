import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Loader2, MessageCircle, Send } from "lucide-react";

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
  onSend,
  loading = false,
  placeholder = "Type your message...",
  emptyTitle = "Start a conversation",
  emptyDescription = "",
  compact = false,
  heightClass,
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
    <div className={clsx("flex min-h-0 flex-col bg-white", finalHeightClass)}>
      <div
        ref={scrollRef}
        className={clsx(
          "min-h-0 flex-1 overflow-y-auto px-5 py-4",
          hasMessages ? "space-y-3" : "flex items-center justify-center"
        )}
      >
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
              <MessageCircle className="h-6 w-6 text-ink-400" />
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
                "flex",
                message.role === "assistant" ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={clsx(
                  "max-w-[85%] break-words rounded-2xl px-4 py-2 text-sm leading-relaxed",
                  message.role === "assistant"
                    ? "bg-ink-100 text-ink-800"
                    : "whitespace-pre-wrap bg-brand-600 text-white",
                  message.tone === "warning" && "bg-amber-50 text-amber-700"
                )}
              >
                {message.role === "assistant" ? (
                  <FormattedMessage content={message.content} />
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-ink-100 px-4 py-2 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating…</span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-ink-100 bg-white p-3"
      >
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
          />

          <Button
            type="submit"
            icon={Send}
            loading={loading}
            disabled={!draft.trim()}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}