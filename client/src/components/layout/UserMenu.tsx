import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, RankGlyph } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { openShortcuts } from './ShortcutsDialog'
import { Icon } from '@/components/icon/Icon'
import { useSite } from '@/context/SiteContext'
import { UserBadges } from '@/components/shared/UserBadges'
import { prefetchHandlers } from '@/routes'

/** Account dropdown — used by the sidebar footer and the mobile topbar. */
export function UserMenu({ children, side = 'top', align = 'start' }: { children: ReactNode; side?: 'top' | 'bottom'; align?: 'start' | 'end' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isStaff, isOwner, previewAsMember, setPreviewAsMember } = useSite()
  if (!user) return null
  const level = Number(user.level) || 1
  return (
    <Menu>
      <MenuTrigger asChild>{children}</MenuTrigger>
      <MenuContent side={side} align={align} className="w-64">
        <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
          <Avatar
            seed={user.username}
            avatar={user.avatar}
            src={typeof user.avatar_url === 'string' ? user.avatar_url : undefined}
            name={user.username}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">
              {typeof user.display_name === 'string' && user.display_name ? user.display_name : user.username}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-text-secondary">
              @{user.username}
              <UserBadges username={user.username} role={typeof user.role === 'string' ? user.role : undefined} />
            </p>
          </div>
          <RankGlyph level={level} size={30} animated={false} />
        </div>
        <MenuSeparator />
        {isStaff && (
          <>
            <MenuItem icon={<Icon name={isOwner ? 'crown' : 'shield'} />} onSelect={() => navigate('/admin')} {...prefetchHandlers('/admin')}>
              Admin
            </MenuItem>
            {isOwner && (
              <MenuItem icon={<Icon name="eye" />} onSelect={() => setPreviewAsMember(true)}>
                View as member
              </MenuItem>
            )}
            <MenuSeparator />
          </>
        )}
        {previewAsMember && (
          <>
            <MenuItem icon={<Icon name="eye-off" />} onSelect={() => setPreviewAsMember(false)}>
              Exit member preview
            </MenuItem>
            <MenuSeparator />
          </>
        )}
        <MenuLabel>Account</MenuLabel>
        <MenuItem icon={<Icon name="profile" />} onSelect={() => navigate('/profile')}>
          Profile
        </MenuItem>
        <MenuItem icon={<Icon name="palette" />} onSelect={() => navigate('/settings')}>
          Avatar studio
        </MenuItem>
        <MenuItem icon={<Icon name="settings" />} shortcut="G ," onSelect={() => navigate('/settings')}>
          Settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Icon name="keyboard" />} shortcut="?" onSelect={openShortcuts}>
          Keyboard shortcuts
        </MenuItem>
        <MenuItem icon={<Icon name="achievements" />} onSelect={() => navigate('/achievements')}>
          Achievements
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<Icon name="logout" />}
          danger
          onSelect={async () => {
            await logout()
            navigate('/auth')
          }}
        >
          Log out
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
