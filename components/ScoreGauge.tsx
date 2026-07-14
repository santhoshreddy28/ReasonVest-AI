"use client";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

export default function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444";
  const data = [{ name: "score", value: score, fill: color }];

  return (
    <div className="relative w-[160px] h-[160px] mx-auto">
      <RadialBarChart
        width={160}
        height={160}
        cx="50%"
        cy="50%"
        innerRadius="70%"
        outerRadius="100%"
        barSize={14}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background dataKey="value" cornerRadius={8} />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-white">{score}</p>
        <p className="text-xs text-slate-400">Score</p>
      </div>
    </div>
  );
}
