import type { ButtonHTMLAttributes, JSX } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
}

export function Button({ variant = 'primary', className, ...rest }: ButtonProps): JSX.Element {
  return <button className={`btn btn--${variant}${className ? ` ${className}` : ''}`} {...rest} />
}
