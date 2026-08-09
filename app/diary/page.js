import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/app/components/BottomNav";
import StudyChat from "@/app/components/StudyChat";
import GrassHill from "@/app/components/GrassHill";

export default async function StudyChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="appShell bandShell">
      <header className="mainHeader bandHeader">
        <p className="headerDate">AI 챗봇</p>
        <h1 className="bandTitle">공부 선배</h1>
      </header>
      <main className="mainContent bandContent">
        <StudyChat />
        <GrassHill />
      </main>
      <BottomNav />
    </div>
  );
}
