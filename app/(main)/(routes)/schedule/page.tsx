"use client";

import { ScheduleGrid } from "./_components/schedule-grid";

const SchedulePage = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="md:max-w-7xl mx-auto p-6 w-full">
        <ScheduleGrid />
      </div>
    </div>
  );
};

export default SchedulePage;

