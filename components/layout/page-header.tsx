type PageHeaderProps = {
  description: string;
  eyebrow: string;
  title: string;
};

export function PageHeader({ description, eyebrow, title }: Readonly<PageHeaderProps>) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
        <p className="max-w-prose text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  );
}
