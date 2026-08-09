import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/app/components/BottomNav";

export default async function DiaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="appShell">
      <header className="mainHeader">
        <div>
          <p className="headerDate">화면 3</p>
          <h1>일기장</h1>
        </div>
      </header>
      <main className="mainContent">
        <p className="todoEmpty">일기장 화면은 준비 중입니다.</p>
      </main>
      <BottomNav />
    </div>
  );
}
