import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold text-slate-900">Aziz POS</h1>
      <p className="text-slate-500">
        Signed in as {session?.user?.name} · {session?.user?.role}
      </p>
    </div>
  );
}
