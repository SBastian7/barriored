import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Registrarse | BarrioRed' }

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-blue-900">BarrioRed</CardTitle>
          <CardDescription>Crea tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="text-center text-sm text-gray-500 mt-4">
            Ya tienes cuenta? <Link href="/auth/login" className="text-blue-600 hover:underline">Ingresar</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
