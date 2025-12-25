import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimeInputWithAMPMProps {
    value: string; // 24h format "HH:MM"
    onChange: (value: string) => void;
    id?: string;
    required?: boolean;
}

export const TimeInputWithAMPM = ({
    value,
    onChange,
    id,
    required,
}: TimeInputWithAMPMProps) => {
    // Convert 24h to 12h format
    const get12HourFormat = (time24: string) => {
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return {
            hours: hours12.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0'),
            period,
        };
    };

    // Convert 12h to 24h format
    const get24HourFormat = (hours12: number, minutes: number, period: string) => {
        let hours24 = hours12;
        if (period === 'PM' && hours12 !== 12) hours24 += 12;
        if (period === 'AM' && hours12 === 12) hours24 = 0;
        return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    const { hours, minutes, period } = get12HourFormat(value);
    const [displayValue, setDisplayValue] = useState(`${hours}:${minutes}`);

    useEffect(() => {
        const { hours, minutes } = get12HourFormat(value);
        setDisplayValue(`${hours}:${minutes}`);
    }, [value]);

    const handleTimeChange = (newTime: string) => {
        setDisplayValue(newTime);
        const [h, m] = newTime.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m) && h >= 1 && h <= 12 && m >= 0 && m <= 59) {
            const time24 = get24HourFormat(h, m, period);
            onChange(time24);
        }
    };

    const handlePeriodToggle = () => {
        const newPeriod = period === 'AM' ? 'PM' : 'AM';
        const [h, m] = displayValue.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
            const time24 = get24HourFormat(h, m, newPeriod);
            onChange(time24);
        }
    };

    return (
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Input
                    id={id}
                    type="time"
                    value={displayValue}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    required={required}
                    className="pr-10"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <button
                type="button"
                onClick={handlePeriodToggle}
                className="px-4 py-2 border rounded-md hover:bg-muted/50 transition-colors font-medium text-sm min-w-[60px]"
            >
                {period}
            </button>
        </div>
    );
};
