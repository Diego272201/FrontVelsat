import { Progress } from "@nextui-org/react";

interface ProgressBarProp {
  value: number;
}

export default function App({value}:ProgressBarProp) {
  return (
    <Progress
      classNames={{
        base: "w-[70%]",        
        track: "drop-shadow-md border border-default",
        indicator: "bg-white",        
        label: "tracking-wider font-medium text-default-600",
        value: "text-white",
      }}
      radius="sm"
      showValueLabel={true}
      size="sm"
      value={value}
    />
  );
}
