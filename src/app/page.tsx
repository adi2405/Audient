"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronsRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { Button } from "@/components/ui/button";

const Page = () => {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "start 20%"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [30, 0]);

  return (
    <div>
      <section className="flex flex-col justify-center items-center pt-40 pb-20">
        <h1 className="text-[56px] font-bold leading-tight">
          The Agentic Experience
        </h1>
        <h1 className="text-[56px] font-bold leading-tight">
          For Customer Support
        </h1>
        <p className="mt-4 text-neutral-700 text-lg">
          We analyze intent, detect emotions, summarize opinions, and generate
          clear arguments
        </p>
        <Link href={"/user-profile"}>
          <div className="group bg-[#FED420] mt-6">
            <Button
              size={"lg"}
              variant={"primary"}
              className="transition-transform group-hover:translate-x-2 group-hover:-translate-y-2"
            >
              Get Started
              <span>
                <ChevronsRight className="size-6" />
              </span>
            </Button>
          </div>
        </Link>
      </section>

      <div ref={ref} className="flex justify-center pb-20 perspective-distant">
        <motion.div style={{ rotateX }}>
          <Image
            src={"/images/hero-image.png"}
            alt="Hero Image"
            width={1120}
            height={630}
            className="rounded-3xl shadow-xl"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Page;
