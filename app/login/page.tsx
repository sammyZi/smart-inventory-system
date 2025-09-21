"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Package, Eye, EyeOff, Shield, Users, ShoppingCart } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    const success = await login(email, password)
    if (!success) {
      setError("Invalid credentials. Please try again.")
    }
    setIsLoading(false)
  }

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
  }

  const demoCredentials = [
    { role: "Administrator", email: "admin@company.com", password: "password", icon: Shield },
    { role: "Store Manager", email: "manager@company.com", password: "password", icon: Users },
    { role: "POS Staff", email: "staff@company.com", password: "password", icon: ShoppingCart }
  ]

  return (
    <div className="min-h-screen bg-secondary/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding */}
        <div className="hidden lg:block space-y-6">
          <div className="flex items-center space-x-4">
            <div className="bg-primary p-4 rounded-lg">
              <Package className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">InvBill</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            A complete inventory and billing solution designed for modern businesses.
            Log in to access your dashboard.
          </p>
          <div className="space-y-2 pt-4">
            <p className="font-semibold text-foreground">Quick Demo Access:</p>
            <div className="flex flex-col space-y-2">
              {demoCredentials.map((cred) => (
                <Button 
                  key={cred.role}
                  variant="outline" 
                  className="justify-start"
                  onClick={() => handleDemoLogin(cred.email, cred.password)}
                >
                  <cred.icon className="mr-2 h-4 w-4" />
                  Log in as {cred.role}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to continue to your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="lg:hidden space-y-2 pt-6">
              <p className="font-semibold text-foreground text-sm text-center">Quick Demo Access:</p>
              <div className="flex flex-col space-y-2">
                {demoCredentials.map((cred) => (
                  <Button 
                    key={cred.role}
                    variant="outline" 
                    size="sm"
                    className="justify-start"
                    onClick={() => handleDemoLogin(cred.email, cred.password)}
                  >
                    <cred.icon className="mr-2 h-4 w-4" />
                    Log in as {cred.role}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
