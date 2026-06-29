import { useState, useEffect } from "react"

const TOAST_TIMEOUT = 5000

export type ToastProps = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

let memoryState: ToastProps[] = []
let listeners: Array<(state: ToastProps[]) => void> = []

function dispatch(action: ToastProps | string) {
  if (typeof action === "string") {
    memoryState = memoryState.filter((t) => t.id !== action)
  } else {
    memoryState = [...memoryState, action]
  }
  listeners.forEach((listener) => listener(memoryState))
}

export function toast(props: Omit<ToastProps, "id">) {
  const id = Math.random().toString(36).substr(2, 9)
  dispatch({ id, ...props })
  setTimeout(() => {
    dispatch(id)
  }, TOAST_TIMEOUT)
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>(memoryState)

  useEffect(() => {
    listeners.push(setToasts)
    return () => {
      const index = listeners.indexOf(setToasts)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return { toasts, toast }
}