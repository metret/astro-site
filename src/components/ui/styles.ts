import type { ButtonProps } from "~/types";
import { cn } from "~/utils";

export function buttonStyles({
  kind = "primary",
  size = "default",
  color = "blue",
}: ButtonProps) {
  return cn(
    "flex items-center justify-center rounded-full text-center font-semibold",
    kind === "primary" && {
      "bg-blue text-white hover:bg-blue-300": color === "blue",
      "bg-orange text-white hover:bg-orange-300": color === "orange",
      "bg-green text-white hover:bg-green-300": color === "green",
      "bg-purple text-white hover:bg-purple-300": color === "purple",
      "px-12 h-16 text-xl/8": size === "large",
    },
    kind === "secondary" && {
      "border-gray-300 text-gray-300 hover:bg-blue hover:border-blue hover:text-white":
        color === "gray",
      "hover:bg-blue text-blue border-blue hover:text-white": color === "blue",
      "text-green border-green hover:bg-green hover:text-white":
        color === "green",
      "text-purple border-purple hover:bg-purple hover:text-white":
        color === "purple",
      "text-orange border-orange hover:bg-orange hover:text-white":
        color === "orange",
    },
    (kind === "secondary" || size === "default") &&
    "px-6 h-[46px] text-lg leading-4",
    kind === "secondary" && "border-2",
    "max-w-full"
  );
}
