export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-slate-200 rounded-2xl animate-pulse" />
            <div className="h-4 w-72 bg-slate-100 rounded-xl animate-pulse" />
          </div>
          <div className="h-12 w-40 bg-emerald-100 rounded-2xl animate-pulse" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl animate-pulse" />
                <div className="h-4 w-24 bg-slate-200 rounded-lg animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>

        {/* Content Area Skeleton */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-10 w-32 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50"
              >
                <div className="w-14 h-14 bg-slate-200 rounded-2xl animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-3 w-32 bg-slate-100 rounded-lg animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-slate-200 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
