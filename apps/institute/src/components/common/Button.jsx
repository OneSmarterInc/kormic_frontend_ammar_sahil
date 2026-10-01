import { Link } from "react-router-dom";
import Button from "@kormic/portal-core/components/common/Button.jsx";
export default function AdminButton({ to, icon: Icon, children, variant, size, className = '', ...props }) {
  if (!to) return <Button icon={Icon} variant={variant} size={size} className={className} {...props}>{children}</Button>;
  return <Link to={to} {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-600 ${variant === 'ghost' || variant === 'secondary' ? 'text-ink-700 hover:bg-ink-100' : 'bg-brand-600 text-white hover:bg-brand-700'} ${className}`}>{Icon && <Icon size={16} />}{children}</Link>;
}
