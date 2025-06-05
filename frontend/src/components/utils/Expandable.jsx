import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown } from "lucide-react";

const ExpandableSection = ({ title, children, isOpen, onToggle }) => (
  <Card className="border border-gray-600 bg-gray-800 mt-10">
    <CardHeader
      className="flex flex-row justify-between items-center cursor-pointer p-4"
      onClick={onToggle}
    >
      <CardTitle className="text-pink-500">{title}</CardTitle>
      {isOpen ? <ChevronUp className="text-pink-500" /> : <ChevronDown className="text-pink-500" />}
    </CardHeader>
    {isOpen && <CardContent className="p-4">{children}</CardContent>}
  </Card>
);

export default ExpandableSection;
