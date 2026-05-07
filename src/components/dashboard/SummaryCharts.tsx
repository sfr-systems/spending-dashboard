"use client";

import { MiniSpendingBarChart } from "./MiniSpendingBarChart";
import { MiniCategoryPieChart } from "./MiniCategoryPieChart";

interface BarDataPoint {
  label: string;
  spent: number;
}

interface PieDataPoint {
  name: string;
  value: number;
  isOther?: boolean;
}

interface Props {
  barData: BarDataPoint[];
  pieData: PieDataPoint[];
}

export function SummaryCharts({ barData, pieData }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div className="h-52">
        <MiniSpendingBarChart data={barData} />
      </div>
      <div className="h-52">
        <MiniCategoryPieChart data={pieData} />
      </div>
    </div>
  );
}
