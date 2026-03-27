import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BENEFIT_TYPES = [
  { value: "percent", label: "אחוז הנחה (%)" },
  { value: "consultation", label: "שעת ייעוץ" },
];

interface BenefitFieldsProps {
  benefitType: string;
  benefitValue: string;
  onTypeChange: (v: string) => void;
  onValueChange: (v: string) => void;
}

const BenefitFields = ({ benefitType, benefitValue, onTypeChange, onValueChange }: BenefitFieldsProps) => {
  return (
    <>
      <div>
        <Label className="font-body text-xs">סוג ההטבה</Label>
        <Select value={benefitType} onValueChange={onTypeChange}>
          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BENEFIT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="font-body text-xs">
          {benefitType === "percent" ? "אחוז הנחה" : "כמות שעות"}
        </Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={benefitValue}
          onChange={(e) => onValueChange(e.target.value)}
          className="bg-background"
          placeholder={benefitType === "percent" ? "15" : "1"}
          autoComplete="off"
        />
      </div>
    </>
  );
};

export default BenefitFields;
