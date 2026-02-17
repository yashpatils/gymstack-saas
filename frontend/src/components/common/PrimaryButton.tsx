import type { ButtonHTMLAttributes } from "react";
import { Button } from "../ui/Button";

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button variant="default" {...props} />;
}
