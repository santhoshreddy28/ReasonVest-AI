import { APP_NAME } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="px-6 py-8 text-center text-sm text-slate-500 border-t border-white/10">
      {APP_NAME} — Investment Decisions Powered by Evidence.
    </footer>
  );
}
