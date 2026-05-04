'use client'

import React from 'react'
import Select, { 
  SelectInstance, 
  Props as SelectProps,
  GroupBase,
  StylesConfig 
} from 'react-select'
import { cn } from '@/lib/utils'

interface CustomSelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
> extends Omit<SelectProps<Option, IsMulti, Group>, 'styles' | 'className'> {
  className?: string
  containerClassName?: string
  formatOptionLabel?: (option: Option, context: any) => React.ReactNode
  instanceId?: string
}

const customStyles = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>(): StylesConfig<Option, IsMulti, Group> => ({
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
    '&:hover': {
      borderColor: 'hsl(var(--ring))',
    },
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.2)' : 'none',
    backgroundColor: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    fontSize: '0.875rem',
    minHeight: '2.5rem',
    borderRadius: '0.375rem',
    borderWidth: '1px',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.375rem',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    zIndex: 50,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'transparent',
    color: state.isFocused ? 'hsl(var(--accent-foreground))' : 'hsl(var(--popover-foreground))',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'hsl(var(--accent))',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'hsl(var(--foreground))',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'hsl(var(--primary-foreground))',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'hsl(var(--primary-foreground))',
    '&:hover': {
      backgroundColor: 'hsl(var(--primary) / 0.8)',
      color: 'hsl(var(--primary-foreground))',
    },
  }),
  input: (base) => ({
    ...base,
    color: 'hsl(var(--foreground))',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
  }),
  groupHeading: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    fontWeight: '600',
  }),
})

function ReactSelectComponent<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>(
  { className, containerClassName, instanceId, ...props }: CustomSelectProps<Option, IsMulti, Group>,
  ref: React.Ref<SelectInstance<Option, IsMulti, Group>>
) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Select<Option, IsMulti, Group>
        ref={ref}
        styles={customStyles<Option, IsMulti, Group>()}
        className={cn('react-select-container', className)}
        classNamePrefix="react-select"
        instanceId={instanceId}
        {...props}
      />
    </div>
  )
}

const ReactSelect = React.forwardRef(ReactSelectComponent) as <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>(
  props: CustomSelectProps<Option, IsMulti, Group> & { ref?: React.Ref<SelectInstance<Option, IsMulti, Group>> }
) => React.ReactElement

export { ReactSelect }
export type { CustomSelectProps }
