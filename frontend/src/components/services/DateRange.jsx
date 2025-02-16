import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

const DateRangePicker = ({ platform, onDateChange }) => {
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const handleDateChange = (key, date) => {
    const newRange = { ...dateRange, [key]: date };
    setDateRange(newRange);
    onDateChange(newRange);
  };

  return (
    <div className="flex space-x-4 mt-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal text-white bg-gray-700 hover:bg-gray-600"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.from ? format(dateRange.from, "dd-MM-yyyy") : <span className="text-gray-400">From Date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange.from}
            onSelect={(date) => handleDateChange("from", date)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal text-white bg-gray-700 hover:bg-gray-600"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.to ? format(dateRange.to, "dd-MM-yyyy") : <span className="text-gray-400">To Date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange.to}
            onSelect={(date) => handleDateChange("to", date)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangePicker;
