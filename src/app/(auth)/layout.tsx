export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="mx-auto flex max-w-md flex-col px-4 py-16">{children}</div>;
}
