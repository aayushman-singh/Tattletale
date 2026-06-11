import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown } from "lucide-react";

const ExpandableSection = ({ title, children, isOpen, onToggle }) => (
  <Card className="border border-ink-700 bg-ink-820 mt-10">
    <CardHeader
      className="flex flex-row justify-between items-center cursor-pointer p-4"
      onClick={onToggle}
    >
      <CardTitle className="font-serif text-rust-300">{title}</CardTitle>
      {isOpen ? <ChevronUp className="text-rust-300" /> : <ChevronDown className="text-rust-300" />}
    </CardHeader>
    {isOpen && <CardContent className="p-4">{children}</CardContent>}
  </Card>
);

export default ExpandableSection;
