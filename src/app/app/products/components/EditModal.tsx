import { useRef, useEffect } from 'react';

interface EditModalProps {
  field: 'price' | 'stock' | 'preorder';
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

export default function EditModal({ field, value, onChange, onSave, onCancel, saving }: EditModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const label = field === 'price' ? 'Изменить цену' : field === 'stock' ? 'Изменить остаток' : 'Изменить предзаказ';
  const unit = field === 'price' ? '₸' : field === 'stock' ? 'шт' : 'д.';
  const placeholder = field === 'price' ? 'Цена' : field === 'preorder' ? '0-30 дней' : 'Количество';

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full bg-white dark:bg-gray-800 rounded-t-2xl p-6 pb-8">
        <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{label}</h3>
        <div className="flex items-center gap-3 mb-6">
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
            className="flex-1 px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder={placeholder}
            min="0"
            max={field === 'preorder' ? 30 : undefined}
            autoFocus
          />
          <span className="text-gray-500 dark:text-gray-400">{unit}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium cursor-pointer"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
