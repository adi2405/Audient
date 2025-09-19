"use client";

import Image from "next/image";
import { MoveRight } from "lucide-react";

import { Button } from "../ui/button";

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-transparent backdrop-blur-xl border-b border-neutral-200 z-10">
      <div className="flex items-center cursor-pointer">
        <Image src="/images/logo.svg" alt="Audient Logo" height={48} width={48} />
        <span className="font-medium text-2xl">Audient</span>
      </div>
      <div className="flex gap-3">
        <Button size={"lg"} variant={"secondary"}>
          Login
        </Button>
        <Button size={"lg"} variant={"primary"}>
          Request a demo
          <span>
            <MoveRight className="size-6" />
          </span>
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
