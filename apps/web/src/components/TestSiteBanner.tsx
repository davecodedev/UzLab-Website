export function TestSiteBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-warning-border bg-warning-bg px-4 py-2 text-center text-sm text-warning-foreground">
      <span aria-hidden="true">⚠️</span>
      <span>
        This is a <strong>test version</strong> of the UzLab website. Content and data shown here
        are not final.
      </span>
    </div>
  );
}
