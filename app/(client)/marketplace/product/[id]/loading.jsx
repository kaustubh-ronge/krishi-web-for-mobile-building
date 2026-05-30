export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 w-20 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-4 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-28 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-4 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-40 bg-slate-200 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Image Skeleton */}
          <div className="aspect-square bg-white rounded-3xl border border-slate-100 animate-pulse" />

          {/* Details Skeleton */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="h-8 w-3/4 bg-slate-200 rounded-2xl animate-pulse" />
              <div className="h-5 w-1/2 bg-slate-100 rounded-xl animate-pulse" />
            </div>

            <div className="h-12 w-40 bg-emerald-100 rounded-2xl animate-pulse" />

            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 rounded-lg animate-pulse" />
            </div>

            {/* Seller Card Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-200 rounded-2xl animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-32 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-4 w-24 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>

            {/* Quantity & Add to Cart Skeleton */}
            <div className="flex items-center gap-4 pt-4">
              <div className="h-12 w-36 bg-white rounded-2xl border border-slate-200 animate-pulse" />
              <div className="h-14 flex-1 bg-slate-900/10 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
