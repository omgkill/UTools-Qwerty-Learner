import { TypingContext } from '@/pages/Typing/store'
import type React from 'react'
import { useContext } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen w-full flex-col items-center">{children}</div>
}
