import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div className="text-sm font-semibold tracking-[0.2em] text-blue-400">AZIZ POS</div>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-4xl font-semibold leading-tight">
            Run every branch from one counter.
          </h1>
          <p className="mt-4 text-slate-400">
            Stock, sales, and reports — live across all your locations.
          </p>

          <div className="mt-10 rotate-[-2deg] rounded-sm bg-white p-5 font-mono text-xs text-slate-900 shadow-2xl">
            <div className="text-center font-bold tracking-widest">AZIZ POS</div>
            <div className="text-center text-slate-500">Main Branch · Dhaka</div>
            <div className="my-3 border-t border-dashed border-slate-400" />
            <div className="flex justify-between"><span>Coca-Cola 330ml</span><span>40.00</span></div>
            <div className="flex justify-between"><span>Rice 1kg</span><span>120.00</span></div>
            <div className="my-3 border-t border-dashed border-slate-400" />
            <div className="flex justify-between font-bold"><span>TOTAL</span><span>160.00 ৳</span></div>
            <div className="mt-4 text-center tracking-widest">|||| ||| || |||||</div>
          </div>
        </div>

        <p className="text-xs text-slate-500">© Aziz POS</p>
      </section>

      <section className="flex items-center justify-center bg-slate-50 p-6">
        <LoginForm />
      </section>
    </main>
  );
}
