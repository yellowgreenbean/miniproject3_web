import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/app/components/BottomNav";
import StudyChat from "@/app/components/StudyChat";
import GrassHill from "@/app/components/GrassHill";
import { MODE_IDS } from "@/lib/coachModes";
import { todayISO } from "@/lib/date";

export default async function StudyChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 챗봇 옵션마다 대화가 따로 이어지므로 모드별로 나눠 읽는다.
  const results = await Promise.all(
    MODE_IDS.map((mode) =>
      supabase
        .from("study_chat_logs")
        .select("role, content")
        .eq("user_id", user.id)
        .eq("mode", mode)
        .order("id", { ascending: false })
        .limit(20)
    )
  );

  const initialThreads = Object.fromEntries(
    MODE_IDS.map((mode, i) => [mode, (results[i].data ?? []).slice().reverse()])
  );

  return (
    <div className="appShell bandShell">
      <header className="mainHeader bandHeader">
        <p className="headerDate">AI 챗봇</p>
        <h1 className="bandTitle">공부 선배</h1>
      </header>
      <main className="mainContent bandContent">
        {/* today 를 서버에서 내려 hydration 이 어긋나지 않게 한다 */}
        <StudyChat initialThreads={initialThreads} today={todayISO()} />
        <GrassHill />
      </main>
      <BottomNav />
    </div>
  );
}
