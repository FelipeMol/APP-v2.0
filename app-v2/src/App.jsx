import { Button } from './components/ui/button'

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 p-8">
        <img src="/logo.png" alt="Logo" className="w-32 h-32 mx-auto" />
        <h1 className="text-4xl font-bold text-gray-900">
          Controle de Obras v2.0
        </h1>
        <p className="text-gray-600">
          Sistema de Gestão de Obras - React + Vite + shadcn/ui
        </p>
        <div className="flex gap-4 justify-center">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
        </div>
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold">
            ✅ Setup Semana 1 Completo!
          </p>
          <p className="text-green-600 text-sm mt-2">
            Node.js, XAMPP, React, Vite, Tailwind e shadcn/ui configurados
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
