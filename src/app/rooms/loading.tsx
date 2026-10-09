export default function RoomsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        <p className="text-lg font-medium text-slate-700">
          Loading chat rooms...
        </p>
      </div>
    </div>
  );
}
