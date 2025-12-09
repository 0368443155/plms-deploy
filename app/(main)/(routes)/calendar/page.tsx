"use client";

import { CalendarView } from "./_components/calendar-view";

const CalendarPage = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="md:max-w-7xl mx-auto p-6 w-full h-full">
        <CalendarView />
      </div>
    </div>
  );
};

export default CalendarPage;

