import { Metadata } from "next";
import { verifySession } from "@/auth/dal";
import ProtectedLayoutShell from "@/components/ui/ProtectedLayoutShell";

export const metadata: Metadata = {
  title: "Home - Econolab",
};

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
    const { user } = await verifySession("/");

    return <ProtectedLayoutShell user={user}>{children}</ProtectedLayoutShell>;
}
