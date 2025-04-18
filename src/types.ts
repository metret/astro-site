export type Link = {
  title: string;
  href: string;
};

export type Color = "blue" | "orange" | "gray" | "purple" | "green";

export type ButtonProps = {
  kind?: "primary" | "secondary";
  size?: "default" | "large";
  color?: Color;
};
