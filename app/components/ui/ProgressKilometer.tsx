import React from "react";
import {CircularProgress} from "@nextui-org/react";
import { IoMdSpeedometer } from "react-icons/io";

interface Props {
    speed: number;
}

export default function App({speed}: Props) {
  return (
    <CircularProgress
      label="Velocidad mayo a:"
      size="lg"
      value={speed}
      color="success"
      formatOptions={{ style: "unit", unit: "kilometer" }}
      showValueLabel={true}
    />
  );
}
