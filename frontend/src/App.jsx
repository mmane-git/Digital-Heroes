import { supabase } from "./lib/supabase";
import { useState } from "react";
import {
  ArrowUpRight,
  Heart,
  Menu,
  X,
  Trophy,
  Leaf,
  ShieldCheck,
  Sparkles,
  ChevronDown,
} from "lucide-react";

const charities = [
  {
    name: "The Ocean Cleanup",
    category: "OCEAN CONSERVATION",
    image:
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=900&q=85",
    impact: "Cleaner oceans for future generations",
  },
  {
    name: "Education for All",
    category: "CHILDREN & EDUCATION",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=85",
    impact: "Opening doors through education",
  },
  {
    name: "Green Earth",
    category: "ENVIRONMENT",
    image:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85",
    impact: "Protecting the places we call home",
  },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
    setMenuOpen(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
  
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
  
    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Account created. Check your email if confirmation is required."
      );
    }
  
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-[#183b2b]">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-[#183b2b]/10 bg-[#f8f7f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-10">
          <button
            onClick={() => scrollTo("home")}
            className="flex items-center gap-2"
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#183b2b] text-white">
              <Heart size={17} fill="currentColor" />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              fairway<span className="text-[#d87948]">.</span>
            </span>
          </button>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <button onClick={() => scrollTo("how")}>How it works</button>
            <button onClick={() => scrollTo("causes")}>Our causes</button>
            <button onClick={() => scrollTo("impact")}>Our impact</button>
          </div>

          <button
            onClick={() => setShowJoin(true)}
            className="hidden items-center gap-2 rounded-full bg-[#183b2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#28533e] md:flex"
          >
            Join the movement <ArrowUpRight size={16} />
          </button>

          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-5 border-t border-[#183b2b]/10 px-6 py-6 md:hidden">
            <button onClick={() => scrollTo("how")}>How it works</button>
            <button onClick={() => scrollTo("causes")}>Our causes</button>
            <button onClick={() => scrollTo("impact")}>Our impact</button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setShowJoin(true);
              }}
              className="rounded-full bg-[#183b2b] px-5 py-3 text-white"
            >
              Join the movement
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <main id="home">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:px-10 md:py-24">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#183b2b]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em]">
              <Sparkles size={14} className="text-[#d87948]" />
              A little game. A greater good.
            </div>

            <h1 className="max-w-xl text-5xl font-medium leading-[1.08] tracking-[-0.055em] md:text-7xl">
              Play for
              <br />
              something
              <br />
              <span className="font-serif italic text-[#d87948]">
                bigger.
              </span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-7 text-[#183b2b]/70 md:text-lg">
              Your golf scores could do more than improve your game.
              Join a community where every round helps create a little
              more good in the world.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowJoin(true)}
                className="flex items-center gap-3 rounded-full bg-[#183b2b] px-7 py-4 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#28533e]"
              >
                Start playing <ArrowUpRight size={18} />
              </button>
              <button
                onClick={() => scrollTo("how")}
                className="flex items-center gap-2 px-3 py-3 text-sm font-semibold"
              >
                Discover how <ChevronDown size={16} />
              </button>
            </div>

            <div className="mt-12 flex items-center gap-4 border-t border-[#183b2b]/15 pt-6">
              <div className="flex -space-x-3">
                {["photo-1534528741775-53994a69daeb", "photo-1500648767791-00dcc994a43e", "photo-1531123897727-8f129e1688ce"].map(
                  (photo) => (
                    <img
                      key={photo}
                      src={`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=100&q=80`}
                      alt=""
                      className="h-9 w-9 rounded-full border-2 border-[#f8f7f2] object-cover"
                    />
                  )
                )}
              </div>
              <p className="text-sm text-[#183b2b]/65">
                A community built around
                <br />
                <span className="font-semibold text-[#183b2b]">
                  sport with a purpose.
                </span>
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full bg-[#e8d7b8]/60 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem]">
              <img
                src="https://images.unsplash.com/photo-1535131749006-b7f58c990bd3?auto=format&fit=crop&w=1400&q=90"
                alt="Golf course surrounded by nature"
                className="h-[430px] w-full object-cover md:h-[570px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#102b20]/70 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-white/15 p-5 text-white backdrop-blur-xl md:bottom-8 md:left-8 md:right-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                      Your game. Your impact.
                    </p>
                    <p className="mt-2 text-2xl font-medium">
                      Good things are in play.
                    </p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#f8f7f2] text-[#183b2b]">
                    <Heart size={21} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values strip */}
        <section className="border-y border-[#183b2b]/10">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-8 sm:grid-cols-3 md:px-10">
            {[
              ["01", "Play your game", "Track your Stableford scores."],
              ["02", "Support your cause", "Choose the charity you care about."],
              ["03", "Be part of something", "Monthly draws. Shared impact."],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-4">
                <span className="font-serif text-xl italic text-[#d87948]">
                  {number}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-[#183b2b]/60">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d87948]">
              Simple by design
            </p>
            <h2 className="mt-4 text-4xl font-medium tracking-[-0.04em] md:text-5xl">
              Your round can
              <br />
              <span className="font-serif italic">make a difference.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Trophy,
                title: "Play & record",
                text: "Enter your Stableford score after each round. Your latest five scores stay on your profile.",
              },
              {
                icon: Heart,
                title: "Choose your cause",
                text: "Support a charity you believe in. Decide how much of your subscription goes towards it.",
              },
              {
                icon: Sparkles,
                title: "Take your chance",
                text: "Your scores contribute to monthly prize draws. Play for the possibility of winning.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className="rounded-3xl border border-[#183b2b]/10 bg-white/60 p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#183b2b]/5 md:p-9"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e9eee5]">
                    <item.icon size={21} />
                  </div>
                  <span className="text-sm text-[#183b2b]/35">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#183b2b]/65">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Charities */}
        <section id="causes" className="bg-[#e9eee5] py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-10">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d87948]">
                  The causes that matter
                </p>
                <h2 className="mt-4 text-4xl font-medium tracking-[-0.04em] md:text-5xl">
                  Good starts
                  <br />
                  <span className="font-serif italic">with you.</span>
                </h2>
              </div>
              <button
                onClick={() => setShowJoin(true)}
                className="flex items-center gap-2 self-start rounded-full border border-[#183b2b]/20 px-5 py-3 text-sm font-semibold transition hover:bg-white md:self-auto"
              >
                Find your cause <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {charities.map((charity) => (
                <article
                  key={charity.name}
                  className="group overflow-hidden rounded-3xl bg-[#f8f7f2]"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={charity.image}
                      alt={charity.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <span className="absolute left-4 top-4 rounded-full bg-[#f8f7f2]/90 px-3 py-2 text-[10px] font-semibold tracking-[0.12em]">
                      {charity.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold">{charity.name}</h3>
                    <p className="mt-2 text-sm text-[#183b2b]/65">
                      {charity.impact}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-[#183b2b]/10 pt-4">
                      <span className="text-xs font-medium text-[#183b2b]/55">
                        Make an impact
                      </span>
                      <ArrowUpRight size={18} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-5 text-xs text-[#183b2b]/55">
              Illustrative charity cards for the UI preview. Verified charity
              profiles will be loaded from the database.
            </p>
          </div>
        </section>

        {/* Impact */}
        <section id="impact" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d87948]">
                More than a scorecard
              </p>
              <h2 className="mt-4 text-4xl font-medium tracking-[-0.04em] md:text-5xl">
                A better kind
                <br />
                <span className="font-serif italic">of winning.</span>
              </h2>
              <p className="mt-6 max-w-md leading-7 text-[#183b2b]/65">
                Every member chooses a cause. Every contribution is transparent.
                Every draw is designed to be fair, accountable, and meaningful.
              </p>
              <button
                onClick={() => setShowJoin(true)}
                className="mt-8 flex items-center gap-3 rounded-full bg-[#183b2b] px-7 py-4 font-semibold text-white transition hover:bg-[#28533e]"
              >
                Become a member <ArrowUpRight size={18} />
              </button>
            </div>

            <div className="rounded-[2rem] bg-[#183b2b] p-8 text-[#f8f7f2] md:p-12">
              <div className="flex items-center gap-3 text-sm text-white/60">
                <Leaf size={18} />
                Built around what matters
              </div>
              <div className="mt-10 space-y-8">
                {[
                  ["Your choice", "Support a cause that means something to you."],
                  ["Your contribution", "Choose your charity contribution percentage."],
                  ["Your trust", "Clear rules, verified winners, transparent impact."],
                ].map(([title, description]) => (
                  <div key={title} className="flex gap-4">
                    <ShieldCheck className="mt-1 shrink-0 text-[#d9a37d]" size={20} />
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/60">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#183b2b]/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex items-center gap-2 font-semibold">
            <Heart size={16} />
            fairway.
          </div>
          <p className="text-[#183b2b]/55">
            Play well. Do good. Make it count.
          </p>
          <p className="text-xs text-[#183b2b]/45">
            © 2026 Fairway. UI prototype.
          </p>
        </div>
      </footer>

      {/* Join modal */}
      {showJoin && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#102b20]/60 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowJoin(false);
            setMessage("");
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#f8f7f2] p-7 md:p-9"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#d87948]">
                  Get started
                </p>
                <h2 className="mt-3 text-3xl font-medium tracking-tight">
                  Join Fairway.
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowJoin(false);
                  setMessage("");
                }}
                aria-label="Close"
              >
                <X />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#183b2b]/65">
              Be part of a community where your game gives back.
            </p>

            <form onSubmit={handleJoin} className="mt-7">
              <label className="text-sm font-medium">Email address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-[#183b2b]/15 bg-white px-4 py-3 outline-none transition focus:border-[#183b2b]"
              />
              <label className="mt-4 block text-sm font-medium">
                Password
              </label>

              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="mt-2 w-full rounded-xl border border-[#183b2b]/15 bg-white px-4 py-3 outline-none focus:border-[#183b2b]"
              />
              <button
                type="submit"
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#183b2b] px-6 py-4 font-semibold text-white hover:bg-[#28533e]"
              >
               {busy ? "Creating account..." : "Create account"}{" "}
               <ArrowUpRight size={17} />
              </button>
            </form>

            {message && (
              <p className="mt-4 rounded-xl bg-[#e9eee5] p-3 text-sm leading-5">
                {message}
              </p>
            )}

            <p className="mt-4 text-center text-xs text-[#183b2b]/45">
              Account creation and subscription will be connected next.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
