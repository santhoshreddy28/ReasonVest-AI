"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// remarkGfm adds the table/strikethrough/task-list/autolink syntax GFM
// expects - react-markdown's default (plain CommonMark) doesn't parse
// tables at all, so replies with tabular data rendered as broken text
// without this.
export default function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
        ul: ({ ...props }) => <ul className="mb-3 ml-5 list-disc space-y-1 marker:text-slate-500" {...props} />,
        ol: ({ ...props }) => <ol className="mb-3 ml-5 list-decimal space-y-1 marker:text-slate-500" {...props} />,
        li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
        strong: ({ ...props }) => <strong className="font-semibold text-white" {...props} />,
        em: ({ ...props }) => <em className="text-slate-300" {...props} />,
        code: ({ ...props }) => (
          <code className="bg-white/10 rounded px-1.5 py-0.5 text-[0.85em] text-brand-300" {...props} />
        ),
        pre: ({ ...props }) => (
          <pre className="bg-black/30 border border-white/10 rounded-lg p-3 overflow-x-auto mb-3 text-[0.85em]" {...props} />
        ),
        h1: ({ ...props }) => <h1 className="text-lg font-semibold mb-2 mt-4 text-white" {...props} />,
        h2: ({ ...props }) => <h2 className="text-base font-semibold mb-2 mt-4 text-white" {...props} />,
        h3: ({ ...props }) => <h3 className="text-sm font-semibold mb-2 mt-3 text-white" {...props} />,
        a: ({ ...props }) => (
          <a
            className="text-brand-300 underline underline-offset-2 hover:text-brand-200"
            target="_blank"
            rel="noreferrer"
            {...props}
          />
        ),
        blockquote: ({ ...props }) => (
          <blockquote className="border-l-2 border-white/20 pl-3 italic text-slate-400 mb-3" {...props} />
        ),
        hr: () => <hr className="border-white/10 my-3" />,
        // GFM tables - wrapped in a scrollable strip so a wide table
        // doesn't blow out the message column on phone-width screens.
        table: ({ ...props }) => (
          <div className="mb-3 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-[0.92em]" {...props} />
          </div>
        ),
        thead: ({ ...props }) => <thead className="bg-white/5" {...props} />,
        th: ({ ...props }) => (
          <th className="border-b border-white/10 px-3 py-2 font-semibold text-white" {...props} />
        ),
        td: ({ ...props }) => <td className="border-b border-white/5 px-3 py-2 align-top text-slate-300" {...props} />,
        tr: ({ ...props }) => <tr className="last:[&>td]:border-b-0" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
