"use client";

import { MiniSpendingBarChart } from "./MiniSpendingBarChart";
import { CategoryShareDonuts } from "./CategoryShareDonuts";

interface BarDataPoint {
  label: string;
  spent: number;
}

interface DonutDataPoint {
  name: string;
  value: number;
  color: string;
}

interface Props {
  barData: BarDataPoint[];
  donutData: DonutDataPoint[];
  donutTotal: number;
}

export function SummaryCharts({ barData, donutData, donutTotal }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div className="h-52">
        <MiniSpendingBarChart data={barData} />
      </div>
      <div className="h-52">
        <CategoryShareDonuts items={donutData} total={donutTotal} />
      </div>
    </div>
  );
}
