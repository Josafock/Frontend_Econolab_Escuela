import { Sidebar } from "@/components/ui/sidebar";
import BreadcrumbWrapper from "@/components/ui/BreadCrumbWrapper";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialogProvider";
import ToastNotification from "@/components/ui/ToastNotification";
import type { User } from "@/schemas";
import PwaControls from "@/components/pwa/PwaControls";
import ServiceNotifications from "@/components/pwa/ServiceNotifications";

type ProtectedLayoutShellProps = {
  user: User;
  children: React.ReactNode;
};

export default function ProtectedLayoutShell({
  user,
  children,
}: ProtectedLayoutShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 text-gray-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.16),transparent_30%),radial-gradient(circle_at_top_left,rgba(15,23,42,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:radial-gradient(rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,white,transparent_72%)]" />

      <div className="relative mx-auto min-h-screen max-w-[1920px] md:pl-[17rem]">
        <Sidebar {...user} />

        <main className="min-w-0 flex-1 px-4 pb-6 pt-20 sm:px-6 sm:pb-8 md:px-8 md:pt-8 xl:px-10">
          <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-[1440px] flex-col">
            <div className="mb-4">
              <PwaControls><ServiceNotifications userId={user.id} /></PwaControls>
            </div>
            <div className="mb-6 rounded-[1.75rem] border border-white/80 bg-white/85 px-4 py-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:px-6">
              <BreadcrumbWrapper />
            </div>

            <ConfirmDialogProvider>
              <div className="min-w-0 flex-1">{children}</div>
            </ConfirmDialogProvider>
          </div>
        </main>
      </div>

      <ToastNotification />
    </div>
  );
}
