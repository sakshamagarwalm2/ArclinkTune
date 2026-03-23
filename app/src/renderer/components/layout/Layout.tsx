import { ReactNode, useState } from 'react'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { Header } from './Header'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden mesh-bg bg-background relative">
      <Sidebar mobileMenuOpen={isMobileMenuOpen} setMobileMenuOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        <Header onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 scrollbar-thin">
          <div className="page-enter">
            {children}
          </div>
        </main>
        
        <StatusBar />
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[45] md:hidden transition-all duration-300 animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}
