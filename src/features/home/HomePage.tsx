import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { TOOLS, toolNumber, toolsByCategory, type ToolDefinition } from '@/app/tools'

function ToolRow({ tool }: { tool: ToolDefinition }) {
  return (
    <li className="border-b border-line">
      <Link
        to={tool.path}
        className="group grid grid-cols-[2.75rem_1fr_auto] items-baseline gap-x-4 px-3 py-5 outline-offset-[-2px] transition-colors duration-150 ease-out hover:bg-surface-2 sm:grid-cols-[3rem_1fr_auto_1.5rem] sm:px-4"
      >
        <span className="font-mono text-sm text-muted tabular-nums transition-colors duration-150 group-hover:text-accent-text">
          {toolNumber(tool.id)}
        </span>
        <span className="min-w-0 transition-transform duration-150 ease-out group-hover:translate-x-1">
          <span className="block text-[17px] font-medium tracking-tight">{tool.name}</span>
          <span className="mt-1 block text-sm text-muted">{tool.description}</span>
        </span>
        <span className="self-center rounded-full border border-line px-2 py-0.5 font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
          {tool.category}
        </span>
        <ArrowRight
          size={18}
          aria-hidden
          className="hidden -translate-x-1.5 self-center text-ink opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:block"
        />
      </Link>
    </li>
  )
}

export function HomePage() {
  return (
    <div>
      <header className="mb-16 sm:mb-20">
        <p className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
          Toolkit / {String(TOOLS.length).padStart(2, '0')} tools
        </p>
        <h1 className="mt-5 max-w-[14ch] font-display text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.015em]">
          Small tools for annoying jobs.
        </h1>
        <p className="mt-5 text-muted">Everything runs in your browser. Nothing is uploaded.</p>
      </header>

      {/* A numbered index, grouped under category labels — no wrapper boxes. */}
      <div className="flex flex-col gap-12">
        {toolsByCategory().map(({ category, tools }) => (
          <section key={category} aria-labelledby={`category-${category}`}>
            <h2
              id={`category-${category}`}
              className="border-b border-ink pb-2 font-mono text-[11px] tracking-[0.06em] text-ink uppercase"
            >
              {category}
              <span className="ml-2 text-muted">{String(tools.length).padStart(2, '0')}</span>
            </h2>
            <ul>
              {tools.map((tool) => (
                <ToolRow key={tool.id} tool={tool} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
