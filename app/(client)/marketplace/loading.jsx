export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero Skeleton */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-64 bg-slate-200 rounded-2xl animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filter Bar Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="flex-1 h-14 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          <div className="h-14 w-40 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          <div className="h-14 w-40 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        </div>

        {/* Product Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm"
            >
              <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-4 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
                <div className="flex items-center justify-between pt-2">
                  <div className="h-6 w-20 bg-emerald-100 rounded-lg animate-pulse" />
                  <div className="h-9 w-24 bg-slate-900/10 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
