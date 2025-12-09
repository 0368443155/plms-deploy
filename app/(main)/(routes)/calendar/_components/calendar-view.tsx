"use client";

import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { EventModal } from "./event-modal";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

const locales = {
  vi: vi,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
});

export const CalendarView = () => {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate date range for current view
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    if (view === "month") {
      start = startOfMonth(date);
      end = endOfMonth(date);
      // Extend to show full weeks
      start = startOfWeek(start, { weekStartsOn: 1 });
      end = endOfWeek(end, { weekStartsOn: 1 });
    } else if (view === "week") {
      start = startOfWeek(date, { weekStartsOn: 1 });
      end = endOfWeek(date, { weekStartsOn: 1 });
    } else {
      // day view
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    }

    return {
      startDate: start.getTime(),
      endDate: end.getTime(),
    };
  }, [date, view]);

  const calendarData = useQuery(api.calendar.getCalendarData, dateRange);

  // Transform data for react-big-calendar
  const events = useMemo(() => {
    if (!calendarData) return [];

    return calendarData.map((event: any) => ({
      id: event._id,
      title: event.title,
      start: new Date(event.startDate),
      end: new Date(event.endDate),
      allDay: event.allDay || false,
      resource: event,
    }));
  }, [calendarData]);

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end || new Date(slotInfo.start.getTime() + 60 * 60 * 1000), // Default 1 hour
      allDay: slotInfo.slots?.length === 1,
    });
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
    setSelectedSlot(null);
    setIsModalOpen(true);
  };

  const navigate = (action: "prev" | "next" | "today") => {
    if (action === "prev") {
      if (view === "month") {
        setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
      } else if (view === "week") {
        setDate(new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000));
      } else {
        setDate(new Date(date.getTime() - 24 * 60 * 60 * 1000));
      }
    } else if (action === "next") {
      if (view === "month") {
        setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
      } else if (view === "week") {
        setDate(new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));
      } else {
        setDate(new Date(date.getTime() + 24 * 60 * 60 * 1000));
      }
    } else {
      setDate(new Date());
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setSelectedSlot(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Lịch tổng quan</h1>
          <p className="text-muted-foreground mt-1">
            Xem lịch học và sự kiện của bạn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("today")}
          >
            Hôm nay
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
            >
              Tháng
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
            >
              Tuần
            </Button>
            <Button
              variant={view === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("day")}
            >
              Ngày
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 border rounded-lg p-4 bg-background">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          popup
          messages={{
            next: "Tiếp",
            previous: "Trước",
            today: "Hôm nay",
            month: "Tháng",
            week: "Tuần",
            day: "Ngày",
            agenda: "Lịch trình",
            date: "Ngày",
            time: "Giờ",
            event: "Sự kiện",
            noEventsInRange: "Không có sự kiện trong khoảng thời gian này",
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.resource?.color || "#3B82F6",
              borderColor: event.resource?.color || "#3B82F6",
              color: "#fff",
            },
          })}
          className="h-full"
        />
      </div>

      {/* Event Modal */}
      <EventModal
        open={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        defaultValues={selectedSlot}
      />
    </div>
  );
};

