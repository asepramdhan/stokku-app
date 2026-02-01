import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50/50 flex-col md:flex-row font-sans">
      {/* HEADER MOBILE */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Package2 className="text-white" size={18} />
          </div>
          <span className="font-extrabold text-lg tracking-tighter">
            STOKKU<span className="text-blue-600">.id</span>
          </span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu size={24} /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-none">
            <Sidebar onClose={() => setOpen(false)} /> {/* PANGGIL SIDEBAR */}
          </SheetContent>
        </Sheet>
      </header>

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-64 border-r bg-white fixed h-full flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <Sidebar /> {/* PANGGIL SIDEBAR */}
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}