"use client";

import Image from "next/image";
import { ChevronsRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import Navbar from "@/components/custom/navbar";
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
      <Navbar />

      <section className="flex flex-col justify-center items-center p-20">
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
        <Button size={"lg"} variant={"primary"} className="mt-6">
          Get Started
          <span>
            <ChevronsRight className="size-6" />
          </span>
        </Button>
      </section>

      <div ref={ref} className="flex justify-center pb-20 perspective-distant">
        <motion.div style={{ rotateX }}>
          <Image
            src={"/images/hero-image.png"}
            alt="Hero Image"
            height={720}
            width={1080}
            className="rounded-3xl shadow-xl"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Page;
