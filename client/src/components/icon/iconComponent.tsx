import type { ComponentType } from 'react'
import { Icon, type IconProps } from './Icon'
import type { IconOrBrand } from './names'

type BoundIcon = ComponentType<Omit<IconProps, 'name'>>
const bound = new Map<IconOrBrand, BoundIcon>()

/**
 * A stable component for one semantic icon — for APIs that take an icon
 * component (combobox items, menus): `icon: iconComponent('problems')`.
 */
export function iconComponent(name: IconOrBrand): BoundIcon {
  let C = bound.get(name)
  if (!C) {
    C = (props) => <Icon name={name} {...props} />
    C.displayName = `Icon(${name})`
    bound.set(name, C)
  }
  return C
}
