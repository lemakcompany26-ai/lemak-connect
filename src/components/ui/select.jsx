"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"

// On desktop screens the Select behaves exactly as before (Radix popover).
// On mobile screens it automatically presents the options as a vaul bottom
// sheet instead of a dropdown — call sites need no changes.
const Select = ({ children, value, defaultValue, onValueChange, ...props }) => {
  const isMobile = useIsMobile()
  if (!isMobile) {
    return (
      <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} {...props}>
        {children}
      </SelectPrimitive.Root>
    )
  }
  return (
    <MobileSelect value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
      {children}
    </MobileSelect>
  )
}
Select.displayName = "Select"

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn("p-1", position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

// --- Mobile bottom-sheet select (vaul) --------------------------------------
// Reads the SelectTrigger (label/placeholder) and SelectItem (values/labels)
// from the regular call-site children, so any existing <Select> renders as a
// bottom sheet on mobile without any call-site change.

function collectSelectItems(children) {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return []
    if (child.type === SelectItem) return [child]
    const nested = child.props && child.props.children
    return nested ? collectSelectItems(nested) : []
  })
}

function findSelectTrigger(children) {
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue
    if (child.type === SelectTrigger) return child
    const nested = child.props && child.props.children
    if (nested) {
      const found = findSelectTrigger(nested)
      if (found) return found
    }
  }
  return null
}

function MobileSelect({ value, defaultValue, onValueChange, children }) {
  const [open, setOpen] = React.useState(false)
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value !== undefined ? value : internal

  const items = collectSelectItems(children)
  const trigger = findSelectTrigger(children)

  let placeholder = "Select an option"
  if (trigger) {
    const valueEl = React.Children.toArray(trigger.props.children).find(
      (c) => React.isValidElement(c) && c.type === SelectValue
    )
    if (valueEl && valueEl.props.placeholder) placeholder = valueEl.props.placeholder
  }

  const selectedItem = items.find((i) => String(i.props.value) === String(current))
  const label = selectedItem ? selectedItem.props.children : placeholder

  const select = (v) => {
    setInternal(v)
    if (onValueChange) onValueChange(v)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          trigger && trigger.props.className
        )}
      >
        <span className={cn("truncate", !selectedItem && "text-muted-foreground")}>{label}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>
      <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[75vh]">
          <div className="px-2 pb-4 overflow-y-auto scrollbar-thin">
            {items.map((item) => {
              const disabled = !!item.props.disabled
              const selected = String(item.props.value) === String(current)
              return (
                <button
                  key={item.props.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => select(item.props.value)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-4 py-3.5 text-sm text-left",
                    selected ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted",
                    disabled && "opacity-50 pointer-events-none"
                  )}
                >
                  <span className="truncate">{item.props.children}</span>
                  {selected && <Check className="h-4 w-4 shrink-0 ml-2" />}
                </button>
              )
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}