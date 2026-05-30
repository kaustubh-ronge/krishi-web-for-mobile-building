export default function ClientLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest animate-pulse">
          Loading…
        </p>
      </div>
    </div>
  );
}
