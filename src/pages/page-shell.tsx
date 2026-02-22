export function PageShell({ title }: { title: string }) {
  return (
    <section className="p-6">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm">{title} page stub.</p>
    </section>
  );
}
