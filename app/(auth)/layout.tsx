export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1a0f] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-white">ParHub</h1>
          <p className="mt-1 text-sm text-[#555]">Track your golf performance</p>
        </div>
        {children}
      </div>
    </div>
  )
}
