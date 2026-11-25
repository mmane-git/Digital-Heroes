
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Menu,
  Trophy,
  Target,
  Leaf,
  Sparkles,
} from "lucide-react";

const charities = [
  {
    name: "Green Future",
    category: "ENVIRONMENT",
    impact: "Restore natural habitats",
    image:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Every Child",
    category: "EDUCATION",
    impact: "Create brighter futures",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Clean Water",
    category: "COMMUNITY",
    impact: "Bring water closer to home",
    image:
      "https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=900&q=85",
  },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f6f1] text-[#183b2b]">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#183b2b]/10 bg-[#f7f6f1]/95 backdrop-blur">
        <nav className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 lg:px-12">
          <button
            onClick={() => scrollTo("home")}
            className="flex items-center gap-2"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#183b2b] text-white">
              <Leaf size={18} />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              fairway<span className="text-[#a1a98a]">.</span>
            </span>
          </button>

          <div className="hidden items-center gap-9 text-sm md:flex">
            <button onClick={() => scrollTo("how")} className="hover:opacity-60">
              How it works
            </button>
            <button
              onClick={() => scrollTo("charities")}
              className="hover:opacity-60"
            >
              Our impact
            </button>
            <button onClick={() => scrollTo("draw")} className="hover:opacity-60">
              Monthly draw
            </button>
          </div>

          <div className="hidden items-center gap-5 md:flex">
            <button className="text-sm font-medium">Log in</button>
            <button
              onClick={() => scrollTo("join")}
              className="rounded-full bg-[#183b2b] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#28533e]"
            >
              Become a member <ArrowRight className="ml-2 inline" size={15} />
            </button>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <Menu />
          </button>
        </nav>

        {menuOpen && (
          <div className="space-y-4 border-t border-[#183b2b]/10 px-6 py-5 md:hidden">
            <button onClick={() => scrollTo("how")} className="block">
              How it works
            </button>
            <button onClick={() => scrollTo("charities")} className="block">
              Our impact
            </button>
            <button onClick={() => scrollTo("join")} className="block">
              Become a member
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <main id="home">
        <section className="mx-auto grid max-w-[1440px] gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#183b2b]/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em]">
              <Sparkles size={14} />
              A little good goes a long way
            </div>

            <h1 className="text-5xl font-medium leading-[1.05] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Your game.
              <br />
              <span className="font-serif italic text-[#879575]">
                Their future.
              </span>
            </h1>

            <p className="mt-7 max-w-lg text-lg leading-8 text-[#183b2b]/70">
              Play golf, track your progress, and help make a real difference.
              Every membership gives your game a purpose beyond the course.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <button
                onClick={() => scrollTo("join")}
                className="rounded-full bg-[#183b2b] px-7 py-4 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#28533e]"
              >
                Join the community <ArrowRight className="ml-3 inline" size={16} />
              </button>
              <button
                onClick={() => scrollTo("how")}
                className="rounded-full border border-[#183b2b]/20 px-7 py-4 text-sm font-medium transition hover:bg-white"
              >
                Discover how it works
              </button>
            </div>

            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-3">
                {["#d9b89c", "#8fa28a", "#c7b4a2", "#6e8d78"].map(
                  (color, i) => (
                    <div
                      key={i}
                      className="h-10 w-10 rounded-full border-2 border-[#f7f6f1]"
                      style={{ backgroundColor: color }}
                    />
                  )
                )}
              </div>
              <p className="text-sm text-[#183b2b]/60">
                A community where every round matters
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="relative min-h-[440px] overflow-hidden rounded-[2rem] bg-[#dce3d4] sm:min-h-[560px]">
              <img
                src="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1400&q=90"
                alt="A golf course surrounded by nature"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#102b1e]/65 via-transparent to-transparent" />

              <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    More than a game
                  </p>
                  <p className="mt-2 text-2xl font-medium">
                    Make your round count.
                  </p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-full border border-white/50">
                  <ArrowUpRight />
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-3 rounded-2xl bg-white p-5 shadow-xl sm:-left-8">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#e9eee3]">
                  <Heart size={20} />
                </div>
                <div>
                  <p className="text-xs text-[#183b2b]/55">Your membership</p>
                  <p className="font-semibold">Creates real impact</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Impact strip */}
        <section className="border-y border-[#183b2b]/10 bg-[#eeeee7]">
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-6 py-8 sm:grid-cols-3 lg:px-12">
            <div className="flex items-center gap-4">
              <Target size={25} strokeWidth={1.5} />
              <div>
                <p className="font-medium">Track your game</p>
                <p className="text-sm text-[#183b2b]/60">Your scores, your progress</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Trophy size={25} strokeWidth={1.5} />
              <div>
                <p className="font-medium">Monthly prize draws</p>
                <p className="text-sm text-[#183b2b]/60">A chance to win</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Heart size={25} strokeWidth={1.5} />
              <div>
                <p className="font-medium">Support a cause</p>
                <p className="text-sm text-[#183b2b]/60">Choose where you give</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-[1440px] px-6 py-24 lg:px-12">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#879575]">
              Simple by design
            </p>
            <h2 className="mt-4 text-4xl font-medium tracking-tight sm:text-5xl">
              Good things happen
              <br />
              <span className="font-serif italic">when you play.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              ["01", "Join Fairway", "Choose a membership and the cause you care about."],
              ["02", "Play your game", "Add your latest golf scores and follow your progress."],
              ["03", "Make an impact", "Your contribution supports a charity while you take part in monthly draws."],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="rounded-3xl border border-[#183b2b]/10 bg-white/60 p-7 transition hover:-translate-y-1 hover:bg-white"
              >
                <p className="text-sm text-[#879575]">{number}</p>
                <h3 className="mt-8 text-2xl font-medium">{title}</h3>
                <p className="mt-3 leading-7 text-[#183b2b]/65">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Charity section */}
        <section id="charities" className="bg-[#183b2b] text-white">
          <div className="mx-auto max-w-[1440px] px-6 py-24 lg:px-12">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#b8c5aa]">
                  Choose what matters
                </p>
                <h2 className="mt-4 text-4xl font-medium tracking-tight sm:text-5xl">
                  Your cause.
                  <br />
                  <span className="font-serif italic text-[#b8c5aa]">
                    Your choice.
                  </span>
                </h2>
              </div>
              <p className="max-w-sm leading-7 text-white/65">
                A better game starts with giving back. Choose a charity that
                reflects what matters to you.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {charities.map((charity) => (
                <article
                  key={charity.name}
                  className="group overflow-hidden rounded-3xl bg-[#264936]"
                >
                  <div className="h-56 overflow-hidden">
                    <img
                      src={charity.image}
                      alt={charity.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-xs tracking-[0.15em] text-[#b8c5aa]">
                      {charity.category}
                    </p>
                    <h3 className="mt-3 text-2xl font-medium">{charity.name}</h3>
                    <p className="mt-2 text-sm text-white/60">{charity.impact}</p>
                    <button className="mt-6 flex items-center gap-2 text-sm">
                      Learn about the cause <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Membership CTA */}
        <section id="join" className="mx-auto max-w-[1440px] px-6 py-24 lg:px-12">
          <div className="overflow-hidden rounded-[2rem] bg-[#e4e8dc] px-7 py-16 text-center sm:px-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#879575]">
              Ready to make a difference?
            </p>
            <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-medium tracking-tight sm:text-6xl">
              Bring purpose
              <br />
              <span className="font-serif italic">to every round.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-md leading-7 text-[#183b2b]/65">
              Become part of a community that believes sport can do more.
            </p>
            <button className="mt-8 rounded-full bg-[#183b2b] px-8 py-4 text-sm font-medium text-white transition hover:bg-[#28533e]">
              Explore membership <ArrowRight className="ml-3 inline" size={16} />
            </button>
            <p className="mt-4 text-xs text-[#183b2b]/50">
              Membership and draw details will be shown before signup.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#183b2b]/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-8 text-sm text-[#183b2b]/55 sm:flex-row sm:items-center sm:justify-between lg:px-12">
          <p className="font-semibold tracking-tight text-[#183b2b]">
            fairway.
          </p>
          <p>Play with purpose. Make every round count.</p>
          <p>© 2026 Fairway. Demo concept.</p>
        </div>
      </footer>
    </div>
  );
}
