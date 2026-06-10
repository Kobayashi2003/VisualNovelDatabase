/** Standard title block for detail pages, passed to `DetailShell`'s `header`
 *  slot: optional leading icon, h1 title, free-form subtitle line below, and a
 *  right-aligned action (e.g. the Character page's spoiler toggle). */

interface DetailHeaderProps {
  title: React.ReactNode
  /** Small glyph rendered before the title (e.g. the Release main-language flag). */
  icon?: React.ReactNode
  /** Rendered under the title — caller supplies its own styling. */
  subtitle?: React.ReactNode
  /** Right-aligned control on the title row. */
  action?: React.ReactNode
}

export function DetailHeader({ title, icon, subtitle, action }: DetailHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white leading-tight">
          {icon}
          <span>{title}</span>
        </h1>
        {subtitle}
      </div>
      {action}
    </div>
  )
}
