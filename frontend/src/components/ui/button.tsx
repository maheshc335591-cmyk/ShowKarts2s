import { isValidElement, type ReactNode } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "./button-variants";

import { cn } from "@/lib/utils";

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  nativeButton,
  render,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const child = asChild && isValidElement<{ children?: ReactNode }>(children) ? children : null;
  const resolvedRender = child ?? render;
  return (
    <ButtonPrimitive
      data-slot="button"
      render={resolvedRender}
      // Native unless render swaps in a non-<button> element (e.g. <Link/>).
      nativeButton={
        nativeButton ??
        (resolvedRender == null ||
          (isValidElement(resolvedRender) && resolvedRender.type === "button"))
      }
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {child ? child.props.children : children}
    </ButtonPrimitive>
  );
}

export { Button };
