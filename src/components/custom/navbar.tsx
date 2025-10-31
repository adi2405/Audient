"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, MoveRight } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

import { Button } from "../ui/button";

const Navbar = () => {
  return (
    <nav className="fixed w-full h-auto flex justify-between items-center px-8 py-4 bg-transparent backdrop-blur-xl border-b border-neutral-200 z-20">
      <Link href={"/"}>
        <div className="flex items-center cursor-pointer">
          <Image
            src="/images/logo.svg"
            alt="Audient Logo"
            height={48}
            width={48}
          />
          <span className="font-medium text-2xl">Audient</span>
        </div>
      </Link>
      <SignedOut>
        <div className="flex gap-6">
          <SignInButton>
            <div className="group bg-[#05DF72] cursor-pointer">
              <Button
                size={"lg"}
                variant={"secondary"}
                className="transition-transform group-hover:translate-x-2 group-hover:-translate-y-2"
              >
                Login
              </Button>
            </div>
          </SignInButton>
          <div className="group bg-[#FED420] cursor-pointer">
            <Button
              size={"lg"}
              variant={"primary"}
              className="transition-transform group-hover:translate-x-2 group-hover:-translate-y-2"
            >
              Request a demo
              <span>
                <MoveRight className="size-6" />
              </span>
            </Button>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="flex gap-6">
          <Link href={"/analyze"}>
            <div className="group bg-[#05DF72] cursor-pointer">
              <Button
                size={"lg"}
                variant={"tertiary"}
                className="transition-transform group-hover:translate-x-2 group-hover:-translate-y-2"
              >
                <Sparkles />
                Analyze
              </Button>
            </div>
          </Link>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "!size-10",
              },
            }}
          />
        </div>
      </SignedIn>
    </nav>
  );
};

export default Navbar;
