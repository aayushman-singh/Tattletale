import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Adjust the import path based on your project structure
import { Input } from "@/components/ui/input"; // Import Input component from shadcn/ui

const RenderDropdown = ({ platform, onSelect }) => {
  const [selectedValue, setSelectedValue] = useState("");
  const [customValue, setCustomValue] = useState("");

  const handleSelectChange = (value) => {
    if (value === "custom") {
      setSelectedValue("custom");
      onSelect(""); // Reset the value when "Custom" is selected
    } else {
      setSelectedValue(value);
      setCustomValue(""); // Reset custom value when a predefined option is selected
      onSelect(value); // Pass the selected value to the parent
    }
  };

  const handleCustomValueChange = (e) => {
    const value = e.target.value;
    setCustomValue(value);
    onSelect(value); // Pass the custom value to the parent
  };

  return (
    <div className="w-full mt-4">
      <Select value={selectedValue} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-full bg-gray-700 focus:ring-2 focus:ring-blue-400">
          <SelectValue placeholder="Select a value" />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 text-white">
        <SelectItem value="custom">Custom</SelectItem>
          <SelectItem value="1">1</SelectItem>
          <SelectItem value="3">3</SelectItem>
          <SelectItem value="5">5</SelectItem>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="20">20</SelectItem>
          <SelectItem value="50">50</SelectItem>
          <SelectItem value="100">100</SelectItem>
          <SelectItem value="200">200</SelectItem>
         
        </SelectContent>
      </Select>

      {/* Show custom input field if "Custom" is selected */}
      {selectedValue === "custom" && (
        <Input
          type="number"
          placeholder="Enter custom value"
          value={customValue}
          onChange={handleCustomValueChange}
          className="mt-2 bg-gray-700 focus:ring-2 focus:ring-blue-400"
        />
      )}
    </div>
  );
};

export default RenderDropdown;