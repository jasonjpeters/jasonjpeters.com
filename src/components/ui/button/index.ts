import { cva, type VariantProps } from 'class-variance-authority'
import Button from './Button.vue'

export { Button }

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap border border-border text-sm font-medium uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        ghost: 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
