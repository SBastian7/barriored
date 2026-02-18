import { RegisterBusinessForm } from '@/components/registration/register-business-form'

export const metadata = { title: 'Registrar negocio | BarrioRed' }

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Registra tu negocio</h1>
      <RegisterBusinessForm />
    </div>
  )
}
