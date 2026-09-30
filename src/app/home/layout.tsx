import { requireUser } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ViewAsBanner } from "@/components/layout/ViewAsBanner";

export const dynamic = "force-dynamic";

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar session={session} />
      {session.isViewAs && session.viewAsRole && (
        <ViewAsBanner viewAsRole={session.viewAsRole} />
      )}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar session={session} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
      <footer className="border-t py-3 text-center text-[11px] text-muted-foreground bg-muted/10">
        Class 1-B • Academic Collaboration & E-Learning Platform
      </footer>
    </div>
  );
}
