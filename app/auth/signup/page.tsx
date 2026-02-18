import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Registrarse | BarrioRed' }

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      {/* Decorative patterns */}
      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rotate-12 border-4 border-black -z-10" />
      <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-secondary/10 -rotate-12 border-4 border-black -z-10" />

      <Card className="w-full max-w-md border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-5xl font-heading font-black uppercase tracking-tighter italic mb-2">
            Barrio<span className="text-primary italic">Red</span>
          </CardTitle>
          <CardDescription className="text-xs font-black uppercase tracking-widest text-black/60 italic">Crea tu cuenta vecinal</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <SignupForm />
          <div className="mt-10 pt-6 border-t-2 border-dashed border-black">
            <p className="text-center text-sm font-bold">
              ¿Ya tienes cuenta? <Link href="/auth/login" className="text-primary hover:underline italic font-black uppercase tracking-tight">Ingresa aquí</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
