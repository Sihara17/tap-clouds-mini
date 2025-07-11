"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, User } from "lucide-react"
import { useLineAuth } from "@/hooks/use-line-auth"

export function UserProfile() {
  const { isAuthenticated, user, logout, isLoading } = useLineAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <Card className="bg-slate-800/50 border-cyan-500/30 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.pictureUrl || "/placeholder.svg"} alt={user.displayName} />
              <AvatarFallback className="bg-cyan-600 text-white">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-white font-semibold">{user.displayName}</h3>
              {user.statusMessage && <p className="text-gray-400 text-sm">{user.statusMessage}</p>}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            disabled={isLoading}
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
