import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/app/components/BottomNav";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="appShell">
      <header className="mainHeader">
        <div>
          <p className="headerDate">화면 2</p>
          <h1>달력</h1>
        </div>
      </header>
      <main className="mainContent">
        <p className="todoEmpty">달력형 할 일 화면은 준비 중입니다.</p>
      </main>
      <BottomNav />
    </div>
  );
}
