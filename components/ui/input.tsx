import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full border-2 border-black bg-white px-4 py-2 text-base shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-1px] focus:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-sans",
        className
      )}
      {...props}
    />
  )
}

export { Input }
