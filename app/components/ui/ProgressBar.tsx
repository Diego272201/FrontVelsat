import { Progress } from "@nextui-org/react";

interface ProgressBarProp {
  value: number;
}

export default function App({value}:ProgressBarProp) {
  return (
    <Progress
      classNames={{
        base: "max-w-md",
        track: "drop-shadow-md border border-default",
        indicator: "bg-gradient-to-r from-pink-500 to-yellow-500",
        label: "tracking-wider font-medium text-default-600",
        value: "text-foreground/60",
      }}
      radius="sm"
      showValueLabel={true}
      size="sm"
      value={value}
    />
  );
}
