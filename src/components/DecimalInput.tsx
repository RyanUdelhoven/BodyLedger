import type { ComponentProps, CSSProperties } from "react";
export const fractionLength = (value: string) =>
  (value.split(/[.,]/)[1] ?? "").length;
type Props = Omit<ComponentProps<"input">, "value" | "type" | "inputMode"> & {
  value: string;
  fractionPlaces?: number;
};
export function DecimalInput({
  value,
  fractionPlaces = Math.max(3, fractionLength(value)),
  className,
  style,
  onFocus,
  onClick,
  ...props
}: Props) {
  const tail = /[.,]/.test(value) ? fractionLength(value) + 1 : 0;
  return (
    <input
      {...props}
      onFocus={(event) => {
        event.currentTarget.select();
        onFocus?.(event);
      }}
      onClick={(event) => {
        event.currentTarget.select();
        onClick?.(event);
      }}
      type="text"
      inputMode="decimal"
      value={value}
      className={["decimal-input", className].filter(Boolean).join(" ")}
      style={
        {
          ...style,
          "--decimal-places": fractionPlaces,
          "--decimal-tail": tail,
        } as CSSProperties
      }
    />
  );
}
