"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
    label: string;
    value: string; // HH:MM format (24h)
    onChange: (value: string) => void;
    required?: boolean;
    id?: string;
}

export const TimePicker = ({ label, value, onChange, required, id }: TimePickerProps) => {
    // Parse 24h time to 12h format
    const parse24hTo12h = (time24: string) => {
        const [hours24, minutes] = time24.split(":").map(Number);
        const period = hours24 >= 12 ? "PM" : "AM";
        const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
        return { hours: hours12, minutes, period };
    };

    // Convert 12h format to 24h
    const convert12hTo24h = (hours: number, minutes: number, period: string) => {
        let hours24 = hours;
        if (period === "AM" && hours === 12) {
            hours24 = 0;
        } else if (period === "PM" && hours !== 12) {
            hours24 = hours + 12;
        }
        return `${hours24.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    };

    const { hours, minutes, period } = parse24hTo12h(value);
    const [selectedHours, setSelectedHours] = useState(hours);
    const [selectedMinutes, setSelectedMinutes] = useState(minutes);
    const [selectedPeriod, setSelectedPeriod] = useState(period);

    // Update when value prop changes
    useEffect(() => {
        const { hours, minutes, period } = parse24hTo12h(value);
        setSelectedHours(hours);
        setSelectedMinutes(minutes);
        setSelectedPeriod(period);
    }, [value]);

    const handleChange = (newHours: number, newMinutes: number, newPeriod: string) => {
        const time24 = convert12hTo24h(newHours, newMinutes, newPeriod);
        onChange(time24);
    };

    return (
        <div>
            <Label htmlFor={id}>{label} {required && "*"}</Label>
            <div className="flex gap-2 mt-2">
                {/* Hours */}
                <Select
                    value={selectedHours.toString()}
                    onValueChange={(val: string) => {
                        const newHours = parseInt(val);
                        setSelectedHours(newHours);
                        handleChange(newHours, selectedMinutes, selectedPeriod);
                    }}
                >
                    <SelectTrigger className="w-[80px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                                {hour}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Minutes */}
                <Select
                    value={selectedMinutes.toString()}
                    onValueChange={(val: string) => {
                        const newMinutes = parseInt(val);
                        setSelectedMinutes(newMinutes);
                        handleChange(selectedHours, newMinutes, selectedPeriod);
                    }}
                >
                    <SelectTrigger className="w-[80px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                        {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                            <SelectItem key={minute} value={minute.toString()}>
                                {minute.toString().padStart(2, "0")}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* AM/PM */}
                <Select
                    value={selectedPeriod}
                    onValueChange={(val: string) => {
                        setSelectedPeriod(val);
                        handleChange(selectedHours, selectedMinutes, val);
                    }}
                >
                    <SelectTrigger className="w-[80px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};
