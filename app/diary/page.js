import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/app/components/BottomNav";
import StudyChat from "@/app/components/StudyChat";
import GrassHill from "@/app/components/GrassHill";

export default async function StudyChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: logRows } = await supabase
    .from("study_chat_logs")
    .select("role, content")
    .eq("user_id", user.id)
    .order("id", { ascending: false })
    .limit(20);

  const initialMessages = (logRows ?? []).slice().reverse();

  return (
    <div className="appShell bandShell">
      <header className="mainHeader bandHeader">
        <p className="headerDate">AI 챗봇</p>
        <h1 className="bandTitle">공부 선배</h1>
      </header>
      <main className="mainContent bandContent">
        <StudyChat initialMessages={initialMessages} />
        <GrassHill />
      </main>
      <BottomNav />
    </div>
  );
}
