export function VariantModal({ isOpen, title, children }: { isOpen: boolean, title: string, children: React.ReactNode }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="pos-modal-content w-full max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-2xl border-none shadow-2xl">
        <h3 className="text-xl font-bold text-foreground mb-6">{title}</h3>
        {children}
      </div>
    </div>
  )
}
