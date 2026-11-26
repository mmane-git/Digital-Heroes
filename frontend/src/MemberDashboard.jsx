import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MemberDashboard({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [charities, setCharities] = useState([]);
  const [charityId, setCharityId] = useState("");
  const [contributionPercent, setContributionPercent] = useState("10");
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingScore, setSavingScore] = useState(false);
  const [savingCharity, setSavingCharity] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState("");
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
  const [membership, setMembership] = useState(null);
  const [message, setMessage] = useState("");
  const [scoreDate, setScoreDate] = useState(getLocalDate());
  const [scoreValue, setScoreValue] = useState("");
  const [editingId, setEditingId] = useState(null);


  const apiBase = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

  const refreshMembership = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    const accessToken = authData?.session?.access_token;
    if (authError || !accessToken) throw new Error("Please sign in again to load membership.");

    const response = await fetch(`${apiBase}/api/subscriptions/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail || "Could not load membership status.");

    const activeMembership = result.active
      ? { plan: result.plan, status: "active" }
      : null;
    setMembership(activeMembership);
    return activeMembership;
  }, [user.id, apiBase]);

  async function handleSubscribe(plan) {
    setSubscriptionLoading(plan);
    setSubscriptionMessage("");

    try {
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Your session expired. Log in again.");
      }

      let response;

      try {
        response = await fetch(`${apiBase}/api/subscriptions/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan }),
        });
      } catch {
        throw new Error("Backend not reachable. Start FastAPI at http://127.0.0.1:8000 and try again.");
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || result.message || "Could not start membership checkout.");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Razorpay Checkout could not load.");

      const checkout = new window.Razorpay({
        key: result.key_id,
        subscription_id: result.subscription_id,
        name: "Digital Heroes",
        description: plan === "monthly" ? "Monthly membership" : "Yearly membership",
        prefill: { email: result.email || user.email },
        theme: { color: "#183b2b" },
        handler: async (payment) => {
          try {
            const verifyResponse = await fetch(`${apiBase}/api/subscriptions/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_subscription_id: payment.razorpay_subscription_id,
                razorpay_signature: payment.razorpay_signature,
              }),
            });
            const verifyResult = await verifyResponse.json().catch(() => ({}));
            if (!verifyResponse.ok) {
              throw new Error(verifyResult.detail || "Payment verification failed.");
            }
            if (verifyResult.active) {
              setMembership({ plan: verifyResult.plan || plan, status: "active" });
            }

            // Webhook delivery can be slightly delayed. Refresh the user's own
            // subscription row for a short period after checkout.
            let activeMembership = await refreshMembership().catch(() => null);
            for (let attempt = 0; !activeMembership && attempt < 5; attempt += 1) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              activeMembership = await refreshMembership().catch(() => null);
            }

            if (activeMembership || verifyResult.active) {
              setSubscriptionMessage("Payment verified. Your membership is active.");
            } else {
              setSubscriptionMessage(
                "Payment received. Razorpay is confirming activation; refresh again shortly if it remains pending."
              );
            }
          } catch (error) {
            setSubscriptionMessage(
              `Payment completed, but verification needs attention: ${error.message}`
            );
          }
        },
        modal: {
          ondismiss: () => setSubscriptionMessage("Checkout closed. No payment was completed."),
        },
      });

      checkout.open();
    } catch (error) {
      setSubscriptionMessage(error.message || "Unable to start checkout.");
    } finally {
      setSubscriptionLoading("");
    }
  }

  const loadScores = useCallback(async () => {
    const { data, error } = await supabase
      .from("golf_scores")
      .select("id, score_date, stableford_score, created_at")
      .eq("user_id", user.id)
      .order("score_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;
    setScores(data ?? []);
  }, [user.id]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const [profileResult, charityResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, role, charity_id, charity_contribution_percent")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("charities")
          .select("id, name, is_active")
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (charityResult.error) throw charityResult.error;
      await refreshMembership();

      const profileData = profileResult.data;
      setProfile(profileData);
      setCharityId(profileData?.charity_id ?? "");
      setContributionPercent(
        String(profileData?.charity_contribution_percent ?? 10)
      );
      setCharities(charityResult.data ?? []);

      await loadScores();
    } catch (error) {
      setMessage(error.message || "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user.id, loadScores, refreshMembership]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!active) return;
      await loadDashboard();
    }

    load();
    return () => {
      active = false;
    };
  }, [loadDashboard]);

  async function handleSaveCharity(event) {
    event.preventDefault();
    setMessage("");

    if (!charityId) {
      setMessage("Please select a charity.");
      return;
    }

    const percent = Number(contributionPercent);
    if (!Number.isInteger(percent) || percent < 10 || percent > 100) {
      setMessage("Contribution must be a whole number between 10% and 100%.");
      return;
    }

    setSavingCharity(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          charity_id: charityId,
          charity_contribution_percent: percent,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((previous) => ({
        ...(previous ?? {}),
        charity_id: charityId,
        charity_contribution_percent: percent,
      }));
      setContributionPercent(String(percent));
      setMessage("Charity selection saved.");
    } catch (error) {
      setMessage(error.message || "Could not save your charity.");
    } finally {
      setSavingCharity(false);
    }
  }

  async function handleScoreSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!scoreDate || scoreDate > getLocalDate()) {
      setMessage("Choose a valid round date that is not in the future.");
      return;
    }

    const score = Number(scoreValue);
    if (!Number.isInteger(score) || score < 1 || score > 45) {
      setMessage("Stableford score must be a whole number from 1 to 45.");
      return;
    }

    setSavingScore(true);
    try {
      const scoreData = {
        score_date: scoreDate,
        stableford_score: score,
      };

      const result = editingId
        ? await supabase
            .from("golf_scores")
            .update(scoreData)
            .eq("id", editingId)
            .eq("user_id", user.id)
            : await supabase
            .from("golf_scores")
            .upsert(
              {
                ...scoreData,
                user_id: user.id,
              },
              {
                onConflict: "user_id,score_date",
              }
            );
      if (result.error) throw result.error;

      setMessage(editingId ? "Score updated." : "Score saved.");
      setEditingId(null);
      setScoreDate(getLocalDate());
      setScoreValue("");
      await loadScores();
    } catch (error) {
      if (error.code === "23505") {
        setMessage("A score is already recorded for that date. Edit the existing score instead.");
      } else {
        setMessage(error.message || "Could not save your score.");
      }
    } finally {
      setSavingScore(false);
    }
  }

  function handleEdit(score) {
    setEditingId(score.id);
    setScoreDate(score.score_date);
    setScoreValue(String(score.stableford_score));
    setMessage("");
  }

  async function handleDelete(score) {
    if (!window.confirm(`Delete the Stableford score for ${formatDate(score.score_date)}?`)) {
      return;
    }

    setMessage("");
    try {
      const { error } = await supabase
        .from("golf_scores")
        .delete()
        .eq("id", score.id)
        .eq("user_id", user.id);

      if (error) throw error;
      setMessage("Score deleted.");
      if (editingId === score.id) cancelEdit();
      await loadScores();
    } catch (error) {
      setMessage(error.message || "Could not delete the score.");
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setScoreDate(getLocalDate());
    setScoreValue("");
    setMessage("");
  }

  async function handleLogoutClick() {
    setLoggingOut(true);
    setMessage("");
    try {
      await onLogout();
    } catch (error) {
      setMessage(error.message || "Could not log out.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f8f7f2] text-[#183b2b]">
        Loading your dashboard...
      </div>
    );
  }

  const selectedCharityName =
    charities.find((charity) => charity.id === charityId)?.name ??
    (charityId ? "Selected charity" : "Not selected");

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-[#183b2b]">
      <header className="flex items-center justify-between border-b border-[#183b2b]/10 px-6 py-5 md:px-10">
        <h1 className="text-2xl font-semibold">
          fairway<span className="text-[#d87948]">.</span>
        </h1>
        <button
          type="button"
          onClick={handleLogoutClick}
          disabled={loggingOut}
          className="rounded-full border border-[#183b2b]/20 px-5 py-2 text-sm font-medium hover:bg-white disabled:opacity-50"
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#d87948]">
          Member dashboard
        </p>
        <h2 className="mt-3 break-words text-4xl font-medium tracking-tight">
          Welcome, {profile?.full_name || user.email}
        </h2>
        <p className="mt-3 text-[#183b2b]/60">
          Your game. Your cause. Your impact.
        </p>

        {message && (
          <div
            role="status"
            className="mt-6 rounded-xl bg-[#e9eee5] p-4 text-sm break-words"
          >
            {message}
          </div>
        )}

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-[#183b2b]/10 bg-white p-7">
            <p className="text-sm text-[#183b2b]/60">Latest scores</p>
            <p className="mt-3 text-4xl font-semibold">{scores.length} / 5</p>
            <p className="mt-2 text-sm text-[#183b2b]/60">Scores recorded</p>
          </article>

          <article className="rounded-3xl border border-[#183b2b]/10 bg-white p-7">
            <p className="text-sm text-[#183b2b]/60">Your charity</p>
            <p className="mt-3 break-words text-xl font-semibold">{selectedCharityName}</p>
            <p className="mt-2 text-sm text-[#183b2b]/60">
              {charityId
                ? `${contributionPercent}% contribution selected`
                : "Choose a charity below"}
            </p>
          </article>

          <article className="rounded-3xl border border-[#183b2b]/10 bg-white p-7">
            <p className="text-sm text-[#183b2b]/60">Membership</p>
            {membership ? (
              <>
                <p className="mt-2 text-xl font-semibold">
                  {membership.plan === "yearly" ? "Yearly membership" : "Monthly membership"}
                </p>
                <p className="mt-2 text-sm font-medium text-[#1b7a45]">
                  Active
                </p>
                <p className="mt-2 text-sm text-[#183b2b]/60">
                  Your membership is active. You can participate.
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-xl font-semibold">Choose a plan</p>
                <p className="mt-2 text-sm text-[#183b2b]/60">
                  Start your membership to participate.
                </p>
                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    onClick={() => handleSubscribe("monthly")}
                    disabled={!!subscriptionLoading}
                    className="rounded-full bg-[#183b2b] px-5 py-3 font-medium text-white hover:bg-[#28533e] disabled:opacity-50"
                  >
                    {subscriptionLoading === "monthly" ? "Starting..." : "Monthly membership"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubscribe("yearly")}
                    disabled={!!subscriptionLoading}
                    className="rounded-full border border-[#183b2b]/20 px-5 py-3 font-medium hover:bg-[#f8f7f2] disabled:opacity-50"
                  >
                    {subscriptionLoading === "yearly" ? "Starting..." : "Yearly membership"}
                  </button>
                </div>
              </>
            )}
            {subscriptionMessage && (
              <p role="status" className="mt-4 rounded-xl bg-[#e9eee5] p-3 text-sm break-words">
                {subscriptionMessage}
              </p>
            )}
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-[#183b2b]/10 bg-white p-7">
          <h2 className="text-2xl font-semibold">Choose your charity</h2>
          <p className="mt-2 text-sm text-[#183b2b]/60">
            Select a cause and choose your contribution percentage.
          </p>

          {charities.length === 0 ? (
            <p className="mt-5 text-sm text-[#183b2b]/60">
              No active charities are available in the database yet.
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
                disabled={savingCharity}
                className="mt-6 w-full rounded-full bg-[#183b2b] px-6 py-4 font-semibold text-white disabled:opacity-50"
              >
                {savingCharity ? "Saving..." : "Save charity selection"}
              </button>
            </form>
          )}
        </section>

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
                disabled={savingScore}
                className="mt-6 w-full rounded-full bg-[#183b2b] px-6 py-4 font-semibold text-white hover:bg-[#28533e] disabled:opacity-50"
              >
                {savingScore
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
                      <p className="font-medium">{formatDate(score.score_date)}</p>
                      <p className="mt-1 text-sm text-[#183b2b]/60">
                        Stableford score
                      </p>
                    </div>

                    <p className="text-2xl font-semibold">{score.stableford_score}</p>

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
