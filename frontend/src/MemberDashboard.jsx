import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function MemberDashboard({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [charities, setCharities] = useState([]);
  const [charityId, setCharityId] = useState("");
  const [contributionPercent, setContributionPercent] = useState(10);
  const [charitySaving, setCharitySaving] = useState(false);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [scoreDate, setScoreDate] = useState(getLocalDate());
  const [scoreValue, setScoreValue] = useState("");
  const [editingId, setEditingId] = useState(null);

  async function loadScores() {
    const { data, error } = await supabase
      .from("golf_scores")
      .select("id, score_date, stableford_score")
      .eq("user_id", user.id)
      .order("score_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      setMessage(error.message);
    } else {
      setScores(data || []);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, charity_id, charity_contribution_percent")
        .eq("id", user.id)
        .single();

      if (!isMounted) return;

      if (profileError) {
        setMessage(profileError.message);
      } else {
        setProfile(profileData);
        setCharityId(profileData.charity_id || "");
        setContributionPercent(profileData.charity_contribution_percent || 10);
      }

      const { data: charityData, error: charityError } = await supabase
        .from("charities")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name");

      if (!isMounted) return;

      if (charityError) {
        setMessage(charityError.message);
      } else {
        setCharities(charityData || []);
      }

      await loadScores();
      if (isMounted) setLoading(false);
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  async function handleSaveCharity(event) {
    event.preventDefault();

    if (!charityId) {
      setMessage("Please select a charity.");
      return;
    }

    const percent = Number(contributionPercent);
    if (!Number.isInteger(percent) || percent < 10 || percent > 100) {
      setMessage("Contribution must be between 10% and 100%.");
      return;
    }

    setCharitySaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        charity_id: charityId,
        charity_contribution_percent: percent,
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setProfile((previous) => ({
        ...previous,
        charity_id: charityId,
        charity_contribution_percent: percent,
      }));
      setContributionPercent(percent);
      setMessage("Charity selection saved.");
    }

    setCharitySaving(false);
  }

  async function handleScoreSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const score = Number(scoreValue);
    if (!Number.isInteger(score) || score < 1 || score > 45) {
      setMessage("Stableford score must be between 1 and 45.");
      setSaving(false);
      return;
    }

    const scoreData = {
      score_date: scoreDate,
      stableford_score: score,
    };

    let result;
    if (editingId) {
      result = await supabase
        .from("golf_scores")
        .update(scoreData)
        .eq("id", editingId)
        .eq("user_id", user.id);
    } else {
      result = await supabase
        .from("golf_scores")
        .insert({
          ...scoreData,
          user_id: user.id,
        });
    }

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(editingId ? "Score updated." : "Score saved.");
      setEditingId(null);
      setScoreDate(getLocalDate());
      setScoreValue("");
      await loadScores();
    }

    setSaving(false);
  }

  function handleEdit(score) {
    setEditingId(score.id);
    setScoreDate(score.score_date);
    setScoreValue(String(score.stableford_score));
    setMessage("");
  }

  async function handleDelete(score) {
    const confirmed = window.confirm("Delete this Stableford score?");
    if (!confirmed) return;

    setMessage("");
    const { error } = await supabase
      .from("golf_scores")
      .delete()
      .eq("id", score.id)
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Score deleted.");
      await loadScores();
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setScoreDate(getLocalDate());
    setScoreValue("");
    setMessage("");
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f8f7f2] text-[#183b2b]">
        Loading your dashboard...
      </div>
    );
  }

  const selectedCharityName =
    charities.find((charity) => charity.id === charityId)?.name || "Not selected";

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-[#183b2b]">
      <header className="flex items-center justify-between border-b border-[#183b2b]/10 px-6 py-5 md:px-10">
        <h1 className="text-2xl font-semibold">
          fairway<span className="text-[#d87948">.</span>
        </h1>
        <button
          onClick={onLogout}
          className="rounded-full border border-[#183b2b]/20 px-5 py-2 text-sm font-medium hover:bg-white"
        >
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#d87948]">
          Member dashboard
        </p>
        <h2 className="mt-3 text-4xl font-medium tracking-tight">
          Welcome, {profile?.full_name || user.email}
        </h2>
        <p className="mt-3 text-[#183b2b]/60">
          Your game. Your cause. Your impact.
        </p>

        {/* Dashboard summary cards */}
        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-[#183b2b]/10 bg-white p-7">
            <p className="text-sm text-[#183b2b]/60">Latest scores</p>
            <p className="mt-3 text-4xl font-semibold">{scores.length} / 5</p>
            <p className="mt-2 text-sm text-[#183b2b]/60">Scores recorded</p>
          </article>

          <article className="rounded-3xl border border-[#183b2b]/10 bg-white p-7">
            <p className="text-sm text-[#183b2b]/60">Your charity</p>
            <p className="mt-3 text-xl font-semibold">{selectedCharityName}</p>
            <p className="mt-2 text-sm text-[#183b2b]/60">
              {charityId
                ? `${contributionPercent}% contribution selected`
                : "Choose a charity below"}
            </p>
          </article>

          <article className="rounded-3xl border border-[#183b2b]/10 bg-white p-7">
            <p className="text-sm text-[#183b2b]/60">Subscription</p>
            <p className="mt-3 text-xl font-semibold">Not active</p>
            <p className="mt-2 text-sm text-[#183b2b]/60">
              Subscription setup is coming next
            </p>
          </article>
        </section>

        {/* Charity selection form */}
        <section className="mt-8 rounded-3xl border border-[#183b2b]/10 bg-white p-7">
          <h2 className="text-2xl font-semibold">Choose your charity</h2>
          <p className="mt-2 text-sm text-[#183b2b]/60">
            Select a cause to support through your membership.
          </p>

          {charities.length === 0 ? (
            <p className="mt-5 text-sm text-[#183b2b]/60">
              No active charities available yet.
            </p>
          ) : (
            <form onSubmit={handleSaveCharity} className="mt-6">
              <label className="block text-sm font-medium" htmlFor="charity-select">
                Charity
              </label>
              <select
                id="charity-select"
                value={charityId}
                onChange={(event) => setCharityId(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-[#183b2b]/15 bg-white px-4 py-3"
              >
                <option value="">Choose a charity</option>
                {charities.map((charity) => (
                  <option key={charity.id} value={charity.id}>
                    {charity.name}
                  </option>
                ))}
              </select>

              <label className="mt-5 block text-sm font-medium" htmlFor="charity-percent">
                Contribution percentage (minimum 10%)
              </label>
              <input
                id="charity-percent"
                type="number"
                min="10"
                max="100"
                step="1"
                required
                value={contributionPercent}
                onChange={(event) => setContributionPercent(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#183b2b]/15 bg-white px-4 py-3"
              />

              <button
                type="submit"
                disabled={charitySaving}
                className="mt-6 w-full rounded-full bg-[#183b2b] px-6 py-4 font-semibold text-white disabled:opacity-50"
              >
                {charitySaving ? "Saving..." : "Save charity selection"}
              </button>
            </form>
          )}
        </section>

        {/* Record round and score history */}
        <section className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-[#183b2b]/10 bg-white p-7">
            <h3 className="text-2xl font-semibold">
              {editingId ? "Edit score" : "Record a round"}
            </h3>
            <p className="mt-2 text-sm text-[#183b2b]/60">
              Enter your Stableford score from 1 to 45.
            </p>

            <form onSubmit={handleScoreSubmit} className="mt-6">
              <label className="block text-sm font-medium" htmlFor="round-date">
                Round date
              </label>
              <input
                id="round-date"
                type="date"
                required
                max={getLocalDate()}
                value={scoreDate}
                onChange={(event) => setScoreDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#183b2b]/15 bg-white px-4 py-3"
              />

              <label className="mt-5 block text-sm font-medium" htmlFor="stableford-score">
                Stableford score
              </label>
              <input
                id="stableford-score"
                type="number"
                required
                min="1"
                max="45"
                step="1"
                value={scoreValue}
                onChange={(event) => setScoreValue(event.target.value)}
                placeholder="Enter score"
                className="mt-2 w-full rounded-xl border border-[#183b2b]/15 bg-white px-4 py-3"
              />

              <button
                type="submit"
                disabled={saving}
                className="mt-6 w-full rounded-full bg-[#183b2b] px-6 py-4 font-semibold text-white hover:bg-[#28533e] disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update score"
                    : "Save score"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="mt-3 w-full rounded-full border border-[#183b2b]/20 px-6 py-3 text-sm font-medium"
                >
                  Cancel edit
                </button>
              )}
            </form>

            {message && (
              <p className="mt-4 rounded-xl bg-[#e9eee5] p-3 text-sm break-words">
                {message}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-[#183b2b]/10 bg-white p-7">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Score history</h3>
              <span className="text-sm text-[#183b2b]/50">Latest 5</span>
            </div>

            {scores.length === 0 ? (
              <p className="mt-8 text-sm text-[#183b2b]/60">
                No scores recorded yet. Add your first round.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {scores.map((score) => (
                  <article
                    key={score.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#f8f7f2] p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(`${score.score_date}T00:00:00`).toLocaleDateString()}
                      </p>
                      <p className="mt-1 text-sm text-[#183b2b]/60">
                        Stableford score
                      </p>
                    </div>

                    <p className="text-2xl font-semibold">
                      {score.stableford_score}
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(score)}
                        className="text-sm font-medium text-[#183b2b] underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(score)}
                        className="text-sm font-medium text-red-700 underline"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
