import { Droplets, Image as ImageIcon, Palette, SunMoon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import {
  AccentPicker,
  AppearanceCards,
  GlassSegmented,
  PhotoCredit,
  WallpaperGrid,
} from './LookControls'
import { GLASS_STYLES } from '@/theme/catalog'

function Row({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode
  title: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-4 py-5 first:pt-1 last:pb-1 md:grid-cols-[210px_1fr] md:gap-8">
      <div>
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-text-primary">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent-brand/15 text-accent-brand [&_svg]:size-3.5">
            {icon}
          </span>
          {title}
        </div>
        {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Settings → Appearance: the System Settings "Appearance" and "Wallpaper"
 *  panes, together. Every change applies instantly and is saved to the
 *  account, so the look follows the user to any browser they sign in on. */
export function LookPanel() {
  const { look, wallpaper, resolvedAccent } = useTheme()
  return (
    <Card>
      <CardContent className="divide-y divide-border px-5 py-4 md:px-6">
        <Row icon={<SunMoon />} title="Appearance" hint="Auto follows your system, switching at sunset if it does.">
          <AppearanceCards />
        </Row>

        <Row
          icon={<Palette />}
          title="Accent colour"
          hint={
            look.accent === 'multicolor' ? (
              <>
                Multicolour takes its colour from the wallpaper — {wallpaper.name} gives{' '}
                <span className="text-accent-brand">{resolvedAccent}</span>.
              </>
            ) : (
              'Buttons, selections, links and focus rings.'
            )
          }
        >
          <AccentPicker />
        </Row>

        <Row icon={<Droplets />} title="Glass" hint={GLASS_STYLES.find((g) => g.id === look.glass)?.hint}>
          <GlassSegmented className="w-full max-w-sm" />
        </Row>

        <Row
          icon={<ImageIcon />}
          title="Wallpaper"
          hint={
            <>
              Originals are drawn for Nexora and change with Light and Dark — hover one to see its other half.
              <PhotoCredit className="mt-2" />
            </>
          }
        >
          <WallpaperGrid />
        </Row>
      </CardContent>
    </Card>
  )
}
