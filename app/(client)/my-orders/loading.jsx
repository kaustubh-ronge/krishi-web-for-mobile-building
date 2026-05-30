export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="mb-10">
          <div className="h-8 w-48 bg-slate-200 rounded-2xl animate-pulse mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>

        {/* Order Cards Skeleton */}
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-5 w-36 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="h-3 w-24 bg-slate-100 rounded-lg animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-24 bg-emerald-100 rounded-xl animate-pulse" />
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="w-16 h-16 bg-slate-200 rounded-xl animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-3 w-28 bg-slate-100 rounded-lg animate-pulse" />
                </div>
                <div className="h-5 w-16 bg-slate-200 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
