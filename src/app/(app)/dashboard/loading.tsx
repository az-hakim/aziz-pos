export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white p-5">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-4 h-6 w-32 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
