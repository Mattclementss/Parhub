export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">ParHub</h1>
          <p className="mt-1 text-sm text-gray-500">Track your golf performance</p>
        </div>
        {children}
      </div>
    </div>
  )
}
