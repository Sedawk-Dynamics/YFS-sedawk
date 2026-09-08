import { Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/**
 * An honest placeholder for the spec sections that have not been implemented
 * yet, so the navigation is complete without pretending the feature works.
 */
export function NotBuiltYet({
  title,
  description,
  specRef,
  planned,
}: {
  title: string
  description: string
  specRef: string
  planned: string[]
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <Construction className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-navy-deep">Not built yet</p>
              <p className="text-sm text-muted-foreground">
                This screen is specified in {specRef} but has not been implemented in this build.
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
              Planned for this screen
            </p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              {planned.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
