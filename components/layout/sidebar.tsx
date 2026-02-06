'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Car,
  Phone,
  Upload,
  Settings,
  Brain,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Mail,
  FlaskConical,
  History,
  Layers,
  Trash2,
  Database,
  Activity,
  Store,
  User,
  BadgeCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, description: 'Översikt & statistik' },
  { name: 'Att ringa', href: '/to-call', icon: Phone, description: 'Prioriterade leads', badge: true },
  { name: 'Playground', href: '/playground', icon: FlaskConical, description: 'Utforska & filtrera' },
  { name: 'Brevutskick', href: '/brev', icon: Mail, description: 'Exportera för brev' },
  { name: 'Historik', href: '/historik', icon: History, description: 'Ringda & brevskickade' },
  { name: 'Prospekttyper', href: '/prospekt-typer', icon: Layers, description: 'Typer & perioder' },
  { name: 'Leads', href: '/leads', icon: Users, description: 'Alla kontakter' },
  { name: 'Fordon', href: '/vehicles', icon: Car, description: 'Fordonslista' },
  { name: 'Import', href: '/import', icon: Upload, description: 'Ladda upp Excel' },
  { name: 'AI Insikter', href: '/ai', icon: Brain, description: 'Mönster & analys' },
  { name: 'Bilprospekt', href: '/bilprospekt', icon: Database, description: 'Sök prospekt' },
]

const secondaryNav = [
  { name: 'Handlare Data', href: '/handlare-biluppgifter', icon: Store, description: 'Biluppgifter handlarbilar' },
  { name: 'Privat Data', href: '/privat-biluppgifter', icon: User, description: 'Privatpersoner på Blocket' },
  { name: 'Sålda Bilar', href: '/salda-bilar', icon: BadgeCheck, description: 'Sålda med köpardata' },
  { name: 'Blocket Logs', href: '/blocket-logs', icon: Activity, description: 'Scraper-övervakning' },
  { name: 'Blocket Marknad', href: '/blocket-marknad', icon: TrendingUp, description: 'Marknadsanalys' },
  { name: 'Papperskorg', href: '/papperskorg', icon: Trash2, description: 'Raderade leads (30 dagar)' },
  { name: 'Inställningar', href: '/settings', icon: Settings, description: 'Konfigurera systemet' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-gray-200 px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">Fordonlista</span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Car className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          <div className={cn("mb-2", !collapsed && "px-3")}>
            {!collapsed && (
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Huvudmeny
              </span>
            )}
          </div>

          {navigation.map((item) => {
            const isActive = pathname === item.href
            const NavItem = (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                )} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                        •
                      </span>
                    )}
                  </>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    {NavItem}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-gray-400">{item.description}</span>
                  </TooltipContent>
                </Tooltip>
              )
            }

            return NavItem
          })}

          {/* Separator */}
          <div className="my-4 border-t border-gray-200" />

          {/* Secondary Navigation */}
          <div className={cn("mb-2", !collapsed && "px-3")}>
            {!collapsed && (
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                System
              </span>
            )}
          </div>

          {secondaryNav.map((item) => {
            const isActive = pathname === item.href
            const NavItem = (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                )} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    {NavItem}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <span className="font-medium">{item.name}</span>
                  </TooltipContent>
                </Tooltip>
              )
            }

            return NavItem
          })}
        </nav>

        {/* Collapse Button */}
        <div className="border-t border-gray-200 p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full justify-center text-gray-400 hover:text-gray-600",
              !collapsed && "justify-start"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Minimera</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
