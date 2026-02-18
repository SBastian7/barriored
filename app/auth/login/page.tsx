import { Suspense } from 'react'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata = { title: 'Ingresar | BarrioRed' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      {/* Decorative patterns */}
      <div className="absolute top-[5%] left-[-5%] w-[30%] h-[30%] bg-primary/10 -rotate-12 border-4 border-black -z-10" />
      <div className="absolute bottom-[5%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rotate-12 border-4 border-black -z-10" />

      <Card className="w-full max-w-md border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-5xl font-heading font-black uppercase tracking-tighter italic mb-2">
            Barrio<span className="text-primary italic">Red</span>
          </CardTitle>
          <CardDescription className="text-xs font-black uppercase tracking-widest text-black/60 italic">Ingresa a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="text-center py-10 font-black uppercase animate-pulse">Cargando...</div>}>
            <LoginForm />
          </Suspense>
          <div className="mt-10 pt-6 border-t-2 border-dashed border-black">
            <p className="text-center text-sm font-bold">
              ¿No tienes cuenta? <Link href="/auth/signup" className="text-primary hover:underline italic font-black uppercase tracking-tight">Regístrate aquí</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
