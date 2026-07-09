export function Footer() {
  return (
    <footer className="mt-auto border-t border-black/10 px-6 py-8 text-sm text-black/60 dark:border-white/10 dark:text-white/60">
      <div className="mx-auto max-w-6xl">© {new Date().getFullYear()} UzLab. All rights reserved.</div>
    </footer>
  );
}
