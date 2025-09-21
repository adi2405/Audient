const Background = () => {
  const boxes = [
    // LEFT
    { side: "left", row: 0, col: 2, color: "bg-[#FFB0F2]" },
    { side: "left", row: 3, col: 1, color: "bg-[#FF5000]" },
    { side: "left", row: 7, col: 2, color: "bg-[#05DF72]" },
    { side: "left", row: 10, col: 1, color: "bg-[#FFB0F2]" },
    { side: "left", row: 13, col: 1, color: "bg-[#05DF72]" },
    { side: "left", row: 14, col: 2, color: "bg-[#FED420]" },
    { side: "left", row: 17, col: 1, color: "bg-[#0462FF]" },
    { side: "left", row: 21, col: 2, color: "bg-[#FF5000]" },
    { side: "left", row: 23, col: 1, color: "bg-[#FED420]" },

    // RIGHT
    { side: "right", row: 2, col: 1, color: "bg-[#FF5000]" },
    { side: "right", row: 5, col: 2, color: "bg-[#FED420]" },
    { side: "right", row: 8, col: 1, color: "bg-[#05DF72]" },
    { side: "right", row: 10, col: 2, color: "bg-[#FFB0F2]" },
    { side: "right", row: 13, col: 1, color: "bg-[#0462FF]" },
    { side: "right", row: 15, col: 2, color: "bg-[#FF5000]" },
    { side: "right", row: 18, col: 1, color: "bg-[#FED420]" },
    { side: "right", row: 19, col: 2, color: "bg-[#05DF72]" },
    { side: "right", row: 22, col: 1, color: "bg-[#FFB0F2]" },
    { side: "right", row: 24, col: 2, color: "bg-[#0462FF]" },
  ];

  return (
    <>
      {/* Left Side Vertical Grid Lines */}
      <div className="fixed top-0 left-18 bottom-0 w-px bg-neutral-200" />
      <div className="fixed top-0 left-36 bottom-0 w-px bg-neutral-200" />

      {/* Right Side Vertical Grid Lines */}
      <div className="fixed top-0 right-18 bottom-0 w-px bg-neutral-200" />
      <div className="fixed top-0 right-36 bottom-0 w-px bg-neutral-200" />

      {/* Left Side grid (2 cols, auto rows, full height) */}
      <div className="absolute top-20 left-0 bottom-0 w-[9rem] grid grid-cols-2 auto-rows-fr min-h-full">
        {Array.from({ length: 50 }).map((_, i) => {
          const row = Math.floor(i / 2);
          const col = (i % 2) + 1;
          const box = boxes.find(
            (b) => b.side === "left" && b.row === row && b.col === col
          );
          return (
            <div
              key={`L-${i}`}
              className={`border-b border-neutral-200 ${box ? box.color : ""}`}
            />
          );
        })}
      </div>

      {/* Right Side grid (2 cols, auto rows, full height) */}
      <div className="absolute top-20 right-0 bottom-0 w-[9rem] grid grid-cols-2 auto-rows-fr min-h-full">
        {Array.from({ length: 50 }).map((_, i) => {
          const row = Math.floor(i / 2);
          const col = (i % 2) + 1;
          const box = boxes.find(
            (b) => b.side === "right" && b.row === row && b.col === col
          );
          return (
            <div
              key={`R-${i}`}
              className={`border-b border-neutral-200 ${box ? box.color : ""}`}
            />
          );
        })}
      </div>
    </>
  );
};

export default Background;
