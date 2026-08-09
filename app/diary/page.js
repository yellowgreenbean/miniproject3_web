import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/app/components/BottomNav";
import StudyChat from "@/app/components/StudyChat";

export default async function StudyChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="appShell">
      <header className="mainHeader">
        <div>
          <p className="headerDate">AI 챗봇</p>
          <h1>공부 선배</h1>
        </div>
      </header>
      <main className="mainContent">
        <StudyChat />
      </main>
      <BottomNav />
    </div>
  );
}
