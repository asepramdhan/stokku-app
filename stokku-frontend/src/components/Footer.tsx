// buat kan footer buat di panggil di layout.tsx
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="flex h-24 w-full items-center justify-center border-t">
      <p className="px-4 text-center text-sm leading-loose">
        &copy; {new Date().getFullYear()} {" "}
        <Link
          to="/"
          className={cn(
            "font-medium underline underline-offset-4 hover:text-slate-900 dark:hover:text-slate-50"
          )}
        >
          STOKKU.id
        </Link>
        . All rights reserved.
      </p>
    </footer>
  );
}