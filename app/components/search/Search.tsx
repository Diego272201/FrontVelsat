import React from "react";
import {Input} from "@nextui-org/react";
import {SearchIcon} from "./SearchIcon";
import '@/app/styles/search.css';

export default function App() {
  return (
    <div className="w-[340px] px-0 rounded-2xl flex justify-center items-center fondoInput text-black/60">
      <Input
        isClearable
        radius="sm"
        classNames={{
          input: [
            "bg-transparent",
            "text-black/50 dark:text-white/50",
            "placeholder:text-default-700/50 dark:placeholder:text-black/50",
          ],
          innerWrapper: "bg-transparent",
          inputWrapper: [
            "bg-customOrange",
            "backdrop-blur-xl",
            "backdrop-saturate-200",
            "group-data-[focused=true]:bg-default-200/50",
            "dark:group-data-[focused=true]:bg-default/60",
            "!cursor-text",
          ],
        }}
        
        placeholder="Buscar unidad"
        startContent={
          <SearchIcon className="text-black/50 dark:text-black/50 text-slate-400 pointer-events-none flex-shrink-0" />
        }
      />
    </div>
  );
}