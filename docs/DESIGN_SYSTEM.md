# Система дизайна - Минимализм

## Цветовая схема

```css
--background: #fafafa
--card-bg: #ffffff
--primary: #2563eb (синий)
--border: #e5e7eb (светло-серый)
--text: #0a0a0a (почти черный)
--muted: #6b7280 (серый для второстепенного текста)
```

## Компоненты

### Кнопки
- **Primary**: `bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium`
- **Secondary**: `border border-gray-300 px-5 py-2 rounded-lg text-sm font-medium`
- **Ghost**: `hover:bg-gray-100 px-3 py-2 rounded-lg text-sm`

### Карточки
```tsx
<div className="bg-white border border-gray-200 rounded-xl p-6">
  {content}
</div>
```

### Инпуты
```tsx
<input className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
```

### Таблицы
- Header: `text-sm font-medium text-gray-600 pb-3 border-b`
- Row: `py-3 border-b border-gray-100`

## Layout

### Sidebar
- Ширина: `256px` (w-64)
- Фон: белый с границей справа
- Высота элемента: `40px`
- Иконки: `20px` (w-5 h-5)

### Header
- Высота: `64px`
- Фон: белый с границей снизу

### Spacing
- Padding страницы: `p-6`
- Gap между элементами: `gap-6` или `gap-4`
- Margin bottom для заголовков: `mb-6`

## Типография

### Заголовки
- H1 (Page Title): `text-2xl font-bold`
- H2 (Section): `text-lg font-semibold`
- H3 (Card Title): `font-semibold`

### Текст
- Body: `text-sm text-gray-900`
- Muted: `text-sm text-gray-600`
- Small: `text-xs text-gray-500`

## Иконки
- Использовать Heroicons (outline)
- Размер: `w-5 h-5` для UI, `w-6 h-6` для больших элементов

## Примеры использования

### Страница с формой
```tsx
<div className="p-6">
  <h1 className="text-2xl font-bold mb-6">Заголовок</h1>
  <div className="bg-white border border-gray-200 rounded-xl p-6">
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Label</label>
        <input className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm" />
      </div>
      <button className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
        Сохранить
      </button>
    </form>
  </div>
</div>
```

### Список с действиями
```tsx
<div className="p-6">
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold">Заголовок</h1>
    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
      + Добавить
    </button>
  </div>
  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">Column</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-gray-100">
          <td className="px-6 py-3 text-sm">Data</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```
