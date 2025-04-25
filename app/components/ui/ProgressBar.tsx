import { Progress } from '@nextui-org/react';

interface ProgressBarProp {
  value: number;
}

export default function App({ value }: ProgressBarProp) {
  return (
    <div className="w-[50%]  bg-gray-200 dark:bg-gray-400">
      <div
        className=" bg-[#f3ae24] p-[2px] text-center text-xs font-medium leading-none text-neutral-900"
        style={{ width: `${value}%` }}
      >
                {Math.round(value)}%

      </div>
    </div>
  );
}
