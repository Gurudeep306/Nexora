import { useState } from 'react'
import {
  Droplets,
  Image as ImageIcon,
  PanelBottom,
  Palette,
  SunMoon,
  Layers,
  Shapes,
  Sparkles,
} from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { DockEditor } from '@/components/layout/DockEditor'
import { useTheme } from '@/context/ThemeContext'
import {
  AccentPicker,
  AppearanceCards,
  CardStylePicker,
  GlassSegmented,
  IconPackPicker,
  IconShapePicker,
  PhotoCredit,
  ThemePresetsPicker,
  WallpaperGrid,
} from './LookControls'
import { CARD_STYLES, GLASS_STYLES, ICON_PACKS } from '@/theme/catalog'

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
    <div className="grid gap-4 py-5 first:pt-1 last:pb-1 md:grid-cols-[220px_1fr] md:gap-8">
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

/** Settings → Appearance: Full suite of appearance, wallpapers, card styles, and icon packs. */
export function LookPanel() {
  const { look, wallpaper, resolvedAccent } = useTheme()
  const [dockOpen, setDockOpen] = useState(false)

  return (
    <Card>
      <CardContent className="divide-y divide-border px-5 py-4 md:px-6">
        <Row
          icon={<Sparkles />}
          title="Theme Presets"
          hint="Curated complete environments pairing wallpapers, chromatic accents, card styles, and icon packs in one click."
        >
          <ThemePresetsPicker />
        </Row>

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
              'Buttons, selections, focus rings and glowing rims.'
            )
          }
        >
          <AccentPicker />
        </Row>

        <Row
          icon={<Layers />}
          title="Card Aesthetics"
          hint={CARD_STYLES.find((c) => c.id === look.cardStyle)?.hint ?? 'Choose card container styling.'}
        >
          <CardStylePicker />
        </Row>

        <Row
          icon={<Shapes />}
          title="Icon Pack & Shape"
          hint={ICON_PACKS.find((p) => p.id === look.iconPack)?.hint ?? 'Customize dock and dashboard icons.'}
        >
          <div className="space-y-3">
            <IconPackPicker />
            <div className="pt-1">
              <span className="mb-2 block text-xs font-semibold text-text-secondary">Icon Shape</span>
              <IconShapePicker />
            </div>
          </div>
        </Row>

        <Row icon={<Droplets />} title="Glass" hint={GLASS_STYLES.find((g) => g.id === look.glass)?.hint}>
          <GlassSegmented className="w-full max-w-sm" />
        </Row>

        <Row
          icon={<ImageIcon />}
          title="Wallpaper"
          hint={
            <>
              Choose from dynamic originals, cyberpunk, deep space, abstract 3D, landscapes, or upload your own image.
              <PhotoCredit className="mt-2" />
            </>
          }
        >
          <WallpaperGrid />
        </Row>

        <Row icon={<PanelBottom />} title="Dock" hint="Choose and order the icons in the Dock and the phone tab bar. You can also right-click the Dock.">
          <Button variant="secondary" size="sm" onClick={() => setDockOpen(true)}>
            Customize Dock…
          </Button>
          <DockEditor open={dockOpen} onClose={() => setDockOpen(false)} />
        </Row>
      </CardContent>
    </Card>
  )
}
