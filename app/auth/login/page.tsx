import { Suspense } from 'react'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata = { title: 'Ingresar | BarrioRed' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-blue-900">BarrioRed</CardTitle>
          <CardDescription>Ingresa a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-center py-4">Cargando...</div>}>
            <LoginForm />
          </Suspense>
          <p className="text-center text-sm text-gray-500 mt-4">
            No tienes cuenta? <Link href="/auth/signup" className="text-blue-600 hover:underline">Registrate</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
