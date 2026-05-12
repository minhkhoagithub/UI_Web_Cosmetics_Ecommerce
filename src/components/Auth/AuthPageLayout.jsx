import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const AuthPageLayout = ({
  badge,
  title,
  description,
  submitLabel,
  helperText,
  helperLink,
  helperLabel,
  onSubmit,
  isSubmitting = false,
  submitDisabled = false,
  children,
}) => {
  const isSubmitButtonDisabled = isSubmitting || submitDisabled

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(250,246,240,0.95)_0%,rgba(255,255,255,1)_45%,rgba(249,244,236,0.88)_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(225,173,106,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(17,17,17,0.08),transparent_28%)]" />

      <div className="container relative mx-auto px-4 py-10 lg:py-16">
        <div className="grid items-center justify-items-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-[0_24px_70px_-48px_rgba(17,17,17,0.45)] backdrop-blur xl:p-8"
          >
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-secondary-foreground">
              {badge}
            </span>

            <div className="mt-5 max-w-xl">
              <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{description}</p>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              {children}

              <button
                type="submit"
                disabled={isSubmitButtonDisabled}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition duration-200 ${
                  isSubmitButtonDisabled ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-0.5'
                }`}
              >
                {submitLabel}
                <ArrowRight size={18} />
              </button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              {helperText}{' '}
              <Link
                to={helperLink}
                className="font-semibold text-foreground transition-colors hover:text-accent"
              >
                {helperLabel}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default AuthPageLayout
