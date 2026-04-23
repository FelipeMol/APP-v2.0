import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

const Dialog = ({ open, onOpenChange, children, modal = true }) => {
  // Bloquear scroll do body quando modal está aberto
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  // Usar Portal para renderizar diretamente no body
  // Isso garante que o modal não seja afetado por transforms ou overflow de containers pais
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Backdrop/Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={() => onOpenChange(false)}
      />
      {/* Modal Container - centralizado na viewport */}
      {children}
    </div>,
    document.body
  )
}

const DialogContent = React.forwardRef(({ className, children, onClose, ...props }, ref) => {
  // Detecta se é um modal fullscreen baseado nas classes
  const isFullscreen = className?.includes('max-w-[95vw]') || className?.includes('w-[95vw]');

  return (
    <div
      ref={ref}
      className={`relative z-[10000] bg-white shadow-2xl border border-gray-200 animate-modal-in w-full ${
        isFullscreen
          ? 'rounded-xl'
          : 'rounded-2xl max-w-lg max-h-[85vh] overflow-auto m-4'
      } ${className || 'p-6'}`}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, children, onClose, ...props }) => (
  <div
    className={`flex items-start justify-between ${className?.includes('px-') ? '' : 'mb-4'} ${className || ''}`}
    {...props}
  >
    <div className="flex-1">
      {children}
    </div>
    {onClose && (
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>
    )}
  </div>
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
  <div
    className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 ${className || ''}`}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-xl font-bold text-gray-900 ${className || ''}`}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-gray-500 mt-1 ${className || ''}`}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
