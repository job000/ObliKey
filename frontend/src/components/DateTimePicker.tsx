import { forwardRef } from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { nb } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

// Register Norwegian locale
registerLocale('nb', nb);

interface DateTimePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showTimeSelect?: boolean;
  dateFormat?: string;
  className?: string;
  error?: string;
}

// Custom input component with better mobile styling
const CustomInput = forwardRef<HTMLButtonElement, any>(({ value, onClick, placeholder, error }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className={`w-full px-4 py-3 border rounded-lg text-left flex items-center justify-between transition-colors ${
      error
        ? 'border-red-300 bg-red-50 focus:ring-red-500'
        : 'border-gray-300 bg-white hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    }`}
  >
    <span className={value ? 'text-gray-900' : 'text-gray-400'}>
      {value || placeholder}
    </span>
    <Calendar className={`w-5 h-5 ${error ? 'text-red-400' : 'text-gray-400'}`} />
  </button>
));

CustomInput.displayName = 'CustomInput';

export default function DateTimePicker({
  selected,
  onChange,
  label,
  placeholder = 'Velg dato og tid',
  required = false,
  minDate,
  maxDate,
  showTimeSelect = true,
  dateFormat = 'PPPp',
  className = '',
  error
}: DateTimePickerProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <ReactDatePicker
        selected={selected}
        onChange={onChange}
        showTimeSelect={showTimeSelect}
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat={dateFormat}
        locale="nb"
        minDate={minDate}
        maxDate={maxDate}
        customInput={<CustomInput error={error} placeholder={placeholder} />}
        calendarClassName="modern-datepicker"
        popperClassName="modern-datepicker-popper"
        showPopperArrow={false}
        popperPlacement="bottom-start"
        withPortal={false}
        portalId="datepicker-portal"
      />

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Simplified DatePicker without time
export function DatePicker(props: Omit<DateTimePickerProps, 'showTimeSelect' | 'dateFormat'>) {
  return (
    <DateTimePicker
      {...props}
      showTimeSelect={false}
      dateFormat="PPP"
    />
  );
}

// Time-only picker
export function TimePicker(props: Omit<DateTimePickerProps, 'showTimeSelect' | 'dateFormat'>) {
  return (
    <ReactDatePicker
      selected={props.selected}
      onChange={props.onChange}
      showTimeSelect
      showTimeSelectOnly
      timeIntervals={15}
      timeCaption="Tid"
      dateFormat="HH:mm"
      locale="nb"
      customInput={<CustomInput error={props.error} placeholder={props.placeholder || 'Velg tid'} />}
      calendarClassName="modern-datepicker"
      popperClassName="modern-datepicker-popper"
      showPopperArrow={false}
    />
  );
}
