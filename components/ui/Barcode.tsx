'use client'

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
}

export const Barcode = ({ 
  value, 
  width = 1.5, 
  height = 25, 
  fontSize = 12, 
  displayValue = true 
}: BarcodeProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue,
          fontSize,
          margin: 0,
        });
      } catch (error) {
        console.error("Barcode generation failed:", error);
      }
    }
  }, [value, width, height, fontSize, displayValue]);

  if (!value) return <span className="text-xs text-muted-foreground italic">-</span>;
  
  return (
    <div className="flex flex-col items-start gap-1">
      <svg ref={svgRef} />
    </div>
  );
};
