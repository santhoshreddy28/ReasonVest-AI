import type { NewsArticle } from "@/types/news";
import { formatDate, truncate } from "@/lib/helpers";

export default function NewsCard({ news }: { news: NewsArticle[] }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-3">Latest News</h3>
      {news.length === 0 ? (
        <p className="text-slate-500 text-sm">No recent news found.</p>
      ) : (
        <ul className="space-y-3">
          {news.map((item) => (
            <li key={item.url || item.title} className="text-sm">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline font-medium"
              >
                {item.title}
              </a>
              <p className="text-slate-500 text-xs mt-0.5">
                {item.source} {item.date ? `• ${formatDate(item.date)}` : ""}
              </p>
              {item.summary && (
                <p className="text-slate-400 text-xs mt-1">{truncate(item.summary, 140)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
