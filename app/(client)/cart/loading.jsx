export default function CartLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="mb-10">
          <div className="h-8 w-48 bg-slate-200 rounded-2xl animate-pulse mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-4 mb-10">
          <div className="h-14 w-44 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          <div className="h-14 w-44 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm"
              >
                <div className="flex items-center gap-5">
                  <div className="w-6 h-6 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="w-24 h-24 bg-slate-100 rounded-2xl animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-48 bg-slate-200 rounded-xl animate-pulse" />
                    <div className="h-4 w-32 bg-slate-100 rounded-lg animate-pulse" />
                    <div className="flex items-center gap-4 pt-2">
                      <div className="h-9 w-28 bg-slate-100 rounded-xl animate-pulse" />
                      <div className="h-5 w-20 bg-emerald-100 rounded-lg animate-pulse" />
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Summary Skeleton */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-5">
              <div className="h-6 w-32 bg-slate-200 rounded-xl animate-pulse" />
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-4 w-16 bg-slate-100 rounded-lg animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-4 w-16 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between">
                  <div className="h-6 w-16 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-6 w-24 bg-slate-200 rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="h-14 w-full bg-slate-900/10 rounded-2xl animate-pulse mt-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
