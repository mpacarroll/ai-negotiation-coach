/* Negotiation Gym scenarios. All people and details are invented.
   Values are in each scenario's own units, higher is always better for you. Where lower is
   better in real life (days until a repair), the value is stored negative and the unit
   formatter shows it as a positive number of days. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.NCGym = root.NCGym || {}; root.NCGym.scenarios = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const W = ['written'];

  const deadline = {
    id: 'deadline',
    title: 'The deadline squeeze',
    domain: 'Work',
    difficulty: 'Starter',
    counterpart: { name: 'Dana Okafor', role: 'your team lead' },
    brief: 'Dana wants the reporting migration finished in ten working days. You have scoped it and it needs about twenty to do properly. Missing a date you agreed to is worse than pushing back now.',
    you: { anchor: '22 workable days', target: '20 workable days', walkaway: '14 workable days, below that you would rather flag the risk to Dana\'s manager' },
    scale: { unit: 'workable days', walkaway: 14, target: 20, best: 22 },
    objectives: [
      { id: 'days', label: 'Secure at least 18 workable days for the full scope', kind: 'value-at-least', value: 18 },
      { id: 'written', label: 'Get the plan confirmed in writing', kind: 'flag', flag: 'written' },
      { id: 'rapport', label: 'Keep Dana on your side', kind: 'rapport-at-least', value: 0 }
    ],
    drills: ['anchor', 'probe', 'trade', 'lock'],
    start: 'start',
    nodes: {
      start: { say: 'I need the migration done by the 14th. That is ten working days. Can you make that happen?',
        choices: [
          { id: 'yes', label: 'Yes, I will make it work.', tags: ['accept_early', 'concede'], rapport: 1, next: 'end_crunch',
            note: 'Agreeing on the spot feels cooperative, but you have just promised a date you already know you will miss.' },
          { id: 'why', label: 'Before I answer, what is driving the 14th?', tags: ['probe'], next: 'why',
            note: 'Asking what sits behind the date is the cheapest information you will ever get.' },
          { id: 'rant', label: 'Ten days is not possible. That is ridiculous.', tags: ['hostile'], rapport: -2, next: 'defensive',
            note: 'True, maybe, but it makes Dana defend the date instead of solving the problem with you.' },
          { id: 'anchor', label: 'Realistically it needs twenty working days. Here is the breakdown.', tags: ['anchor', 'evidence'], next: 'anchored',
            note: 'A specific number with the work behind it sets the range for the rest of the talk.' }
        ] },
      why: { say: { cooperative: 'Finance wants the new numbers for the board on the 21st. Honestly, I padded a week.',
          firm: 'Leadership asked for it. The date is the date.',
          evasive: 'It is just the date we landed on. Let us not overthink it.' },
        choices: [
          { id: 'phase', label: 'If the board needs it on the 21st, could I deliver the board figures on the 19th and the full migration by the 28th?', tags: ['anchor', 'trade', 'evidence'],
            next: { cooperative: 'end_phased', firm: 'firm_phase', evasive: 'pin' },
            note: 'Splitting the deliverable gives them what they actually need first. This is the strongest move in the scenario.' },
          { id: 'try', label: 'Okay, I will try for the 14th.', tags: ['concede', 'accept_early'], next: 'end_crunch',
            note: 'You learned something and then did not use it.' },
          { id: 'twenty', label: 'I will need twenty days.', tags: ['anchor'], next: 'anchored',
            note: 'A fine anchor, though it ignores what you just learned about their real deadline.' }
        ] },
      anchored: { say: { cooperative: 'Twenty is a lot. Where does the time go?',
          firm: 'Twenty days is not happening. I can give you twelve.',
          evasive: 'Let me think about it. Can you just start and we will see?' },
        choices: [
          { id: 'explain', label: 'Three days is testing the old reports alone. Skip it and errors reach finance. What matters most to you, the date or the full scope?', tags: ['probe', 'evidence', 'reframe'],
            next: { cooperative: 'scope', firm: 'scope', evasive: 'pin' },
            note: 'You turned their pushback into their choice between two costs.' },
          { id: 'twelve', label: 'Fine, twelve.', tags: ['concede'], next: 'end_twelve',
            note: 'You dropped eight days without asking for anything back.' },
          { id: 'silence', label: '(Say nothing. Let the pause sit.)', tags: ['silence'],
            next: { cooperative: 'scope', firm: 'firm_counter', evasive: 'pin' },
            note: 'Silence after a counter often makes the other side improve their own offer.' },
          { id: 'escalate', label: 'Then I will take it to your manager.', tags: ['hostile', 'batna'], rapport: -2, next: 'end_escalate',
            note: 'Escalation is a real alternative, but leading with it as a threat costs the relationship you need for the next project.' }
        ] },
      defensive: { say: { cooperative: 'Whoa. Okay. Tell me what you think is possible.',
          firm: 'I did not ask for commentary. Ten days.',
          evasive: 'Let us take this offline.' },
        choices: [
          { id: 'reset', label: 'Sorry, that came out wrong. It needs twenty days, and here is why.', tags: ['anchor', 'evidence'], rapport: 1, next: 'anchored',
            note: 'A quick reset recovers most of the damage. Owning it is cheap.' },
          { id: 'fold', label: 'Fine. Ten days.', tags: ['concede'], next: 'end_crunch',
            note: 'You raised the heat and then gave in, which is the worst of both.' }
        ] },
      scope: { say: { default: 'The board numbers are what matter. The archive reports could wait.',
          firm: 'Both. But if I had to choose, the archive could slip.' },
        choices: [
          { id: 'plan', label: 'Then: board figures by the 19th, full migration by the 28th, and I will send a short written plan today so we are aligned.', tags: ['trade', 'lock'], flags: W,
            next: { default: 'end_phased', firm: 'end_phased_firm' },
            note: 'Specific dates plus a written plan. This is how a verbal yes survives the week.' },
          { id: 'rush', label: 'So I will do everything by the 14th and skip testing.', tags: ['concede'], next: 'end_rushed',
            note: 'You traded away quality, which was the thing you were protecting.' },
          { id: 'vague', label: 'Great, I will aim for the end of the month or so.', tags: ['vague'], next: 'end_vague',
            note: '"Or so" invites the date to drift back toward theirs.' }
        ] },
      firm_phase: { say: 'The 28th is too late. Best I can do is the 23rd for the full thing.',
        choices: [
          { id: 'trade23', label: 'I can do the 23rd if the archive reports move to a phase two. Can we put that in writing?', tags: ['trade', 'lock'], flags: W, next: 'end_phased_firm',
            note: 'You accepted their date only in exchange for less scope. A clean trade.' },
          { id: 'all23', label: 'Okay, the 23rd for everything.', tags: ['concede'], next: 'end_all23',
            note: 'You took their date and kept all the scope. The squeeze just moved.' },
          { id: 'esc', label: 'Then I need to flag the risk to your manager.', tags: ['batna', 'hostile'], rapport: -2, next: 'end_escalate',
            note: 'A better deal was still on the table. Escalate when the talk is exhausted, not before.' }
        ] },
      firm_counter: { say: '... Look. Fifteen days. That is my ceiling.',
        choices: [
          { id: 'trade15', label: 'Fifteen works if the archive reports move to phase two. I will write it up today.', tags: ['trade', 'lock'], flags: W, next: 'end_phased_firm',
            note: 'The silence moved them three days, and the trade bought you the rest.' },
          { id: 'take15', label: 'Fifteen it is.', tags: ['accept_early'], next: 'end_15',
            note: 'You took the first improvement without testing for more.' },
          { id: 'what', label: 'What would make twenty possible?', tags: ['probe', 'reframe'], next: 'scope',
            note: 'Handing them the problem keeps the door open.' }
        ] },
      pin: { say: 'Let us just get going and revisit next week.',
        choices: [
          { id: 'book', label: 'Happy to start today. Can we book fifteen minutes Thursday to set the date? I will email my estimate now.', tags: ['lock', 'evidence'], flags: W, next: 'end_pinned',
            note: 'With an evasive counterpart, the win is a calendar slot and a paper trail.' },
          { id: 'sure', label: 'Sure, we will revisit.', tags: ['vague', 'concede'], next: 'end_drift',
            note: 'Next week never comes, and the original date stays the official one.' },
          { id: 'demand', label: 'I need an answer now or I will not start.', tags: ['hostile'], rapport: -2, next: 'end_escalate',
            note: 'Ultimatums against a staller usually end with someone else deciding.' }
        ] },
      end_crunch: { say: 'Great, thanks. I knew I could count on you.', outcome: { id: 'crunch', label: 'Agreed to ten days', value: 10,
        summary: 'You ship late with errors in the numbers, and the miss is on you.' } },
      end_twelve: { say: 'Twelve it is. Thanks for being flexible.', outcome: { id: 'twelve', label: 'Twelve days, full scope', value: 12,
        summary: 'Better than ten, still short. Expect weekend work.' } },
      end_rushed: { say: 'Okay. Just make sure the board figures are right.', outcome: { id: 'rushed', label: 'Ten days, no testing', value: 12,
        summary: 'The date holds, but untested reports go to finance.' } },
      end_15: { say: 'Good. Fifteen days.', outcome: { id: 'fifteen', label: 'Fifteen days, full scope', value: 15,
        summary: 'Workable with long days. You left a scope trade on the table.' } },
      end_all23: { say: 'Good. The 23rd, everything.', outcome: { id: 'all23', label: 'The 23rd, full scope', value: 15,
        summary: 'More calendar, same pile of work. Tight but possible.' } },
      end_vague: { say: 'End of the month-ish. Sure.', outcome: { id: 'vague', label: 'A soft end-of-month date', value: 16,
        summary: 'By the 20th Dana is asking why it is not done.' } },
      end_escalate: { say: 'Fine. Let us get my manager in the room.', outcome: { id: 'escalate', label: 'Escalated', value: 16, rapport: -1,
        summary: 'You get sixteen days after a tense meeting, and Dana remembers it.' } },
      end_phased_firm: { say: 'Okay. Send me the plan.', outcome: { id: 'phased_firm', label: 'The 23rd, archive in phase two', value: 18,
        summary: 'Board figures on time, full scope a little later. A solid result against a firm lead.' } },
      end_pinned: { say: 'Thursday works. Send it over.', outcome: { id: 'pinned', label: 'Started, with a date-setting meeting booked', value: 20,
        summary: 'Your estimate is on record before anyone can forget it. Thursday sets twenty days.' } },
      end_phased: { say: 'That is actually better for me. Let us do it.', outcome: { id: 'phased', label: 'Board figures the 19th, full migration the 28th', value: 22,
        summary: 'Dana gets what the board needs, you get the time the work needs.' } },
      end_drift: { say: 'Great. Talk next week.', outcome: { id: 'drift', label: 'Left to drift', value: 10,
        summary: 'The 14th stays the official date and you are blamed when it slips.' } }
    }
  };

  const remote = {
    id: 'remote',
    title: 'Two days from home',
    domain: 'Work',
    difficulty: 'Intermediate',
    counterpart: { name: 'Priya Raman', role: 'your operations manager' },
    brief: 'You want to work from home two days a week. You did a remote pilot last spring and your output went up. Priya worries about coverage and the Monday handoffs.',
    you: { anchor: 'Two set days, Tuesday and Thursday', target: '2 remote days a week', walkaway: 'Nothing changes. You would start looking at roles that offer it.' },
    scale: { unit: 'remote days a week', unitOne: 'remote day a week', walkaway: 0, target: 2, best: 2 },
    objectives: [
      { id: 'days', label: 'Get two remote days a week', kind: 'value-at-least', value: 2 },
      { id: 'written', label: 'A written trial with a review date', kind: 'flag', flag: 'written' },
      { id: 'rapport', label: 'Keep it collaborative', kind: 'rapport-at-least', value: 0 }
    ],
    drills: ['anchor', 'evidence', 'trade', 'lock', 'batna'],
    start: 'start',
    nodes: {
      start: { say: 'You wanted to talk about your schedule?',
        choices: [
          { id: 'ask', label: 'I would like to work from home two days a week, Tuesdays and Thursdays. My output went up during the pilot last spring, and I want to keep that going.', tags: ['anchor', 'evidence'], next: 'reaction',
            note: 'Specific days and a track record. Priya has something concrete to say yes to.' },
          { id: 'soft', label: 'I was hoping for a bit more flexibility sometimes?', tags: ['vague'], next: 'vague',
            note: '"A bit more flexibility" gives Priya nothing to agree to and an easy way to say "we are flexible already."' },
          { id: 'fair', label: 'Everyone else gets remote days. It is not fair that I do not.', tags: ['hostile'], rapport: -2, next: 'fair',
            note: 'Fairness arguments invite a debate about other people. Keep it about your work.' }
        ] },
      vague: { say: { cooperative: 'Sure, what did you have in mind?', firm: 'Flexibility how? We need people here.', evasive: 'We are all pretty flexible here, I think. Anything else?' },
        choices: [
          { id: 'specific', label: 'Specifically, two remote days a week, Tuesdays and Thursdays.', tags: ['anchor'], next: 'reaction',
            note: 'Recovered. Specifics turn a mood into a request.' },
          { id: 'never', label: 'Oh, nothing specific. Never mind.', tags: ['concede'], next: 'end_nothing',
            note: 'You walked in with an ask and left without making it.' }
        ] },
      fair: { say: { cooperative: 'I can hear you are frustrated. What are you actually asking for?', firm: 'This is not about fairness. Is there a request here?', evasive: 'I do not want to get into comparisons.' },
        choices: [
          { id: 'reset', label: 'Fair point. I am asking for two remote days a week, and here is my record from the pilot.', tags: ['anchor', 'evidence'], rapport: 1, next: 'reaction',
            note: 'A good reset: you dropped the comparison and made a clean ask.' },
          { id: 'forget', label: 'Forget it.', tags: ['concede'], rapport: -1, next: 'end_nothing',
            note: 'You raised the temperature and then left with nothing.' }
        ] },
      reaction: { say: { cooperative: 'Two days might work. My worry is the Monday handoffs with the warehouse.',
          firm: 'Two is too many. Our policy is one, and only for senior staff.',
          evasive: 'Interesting. Let me raise it with HR at some point.' },
        choices: [
          { id: 'need', label: 'What would you need to see to be comfortable with it?', tags: ['probe', 'reframe'],
            next: { cooperative: 'concern', firm: 'concern', evasive: 'hr' },
            note: 'You found out what the real objection is before negotiating against it.' },
          { id: 'one', label: 'Okay, one day is fine.', tags: ['concede', 'accept_early'], next: 'end_one',
            note: 'You halved your ask at the first sign of resistance.' },
          { id: 'threat', label: 'If that is not possible here, I will start looking at roles that offer it.', tags: ['batna', 'hostile'], rapport: -1,
            next: { cooperative: 'concern', firm: 'end_ultimatum', evasive: 'hr' },
            note: 'Your alternative is real, but naming it this early sounds like a threat, and a firm manager calls it.' }
        ] },
      concern: { say: { cooperative: 'Mainly that the handoffs and the Thursday standup do not suffer.',
          firm: 'Coverage. If something breaks on the floor, I need someone here within the hour.' },
        choices: [
          { id: 'trial', label: 'Then a 90-day trial: two days, never Monday, reachable by phone and on site within an hour if needed. We review together at the end, and I will put it in an email today.', tags: ['trade', 'lock'], flags: W,
            next: { cooperative: 'end_two_trial', firm: 'firm_trial', evasive: 'end_two_trial' },
            note: 'You answered the objection and made it easy to say yes: a trial is low risk for them.' },
          { id: 'promise', label: 'I will just be really responsive, I promise.', tags: ['vague'], next: 'end_one_vague',
            note: 'A promise is not a plan. Priya cannot point to it later.' },
          { id: 'silence', label: '(Say nothing. Let Priya think.)', tags: ['silence'],
            next: { cooperative: 'end_two_handshake', firm: 'firm_trial', evasive: 'end_two_handshake' },
            note: 'Silence let Priya talk herself toward yes.' }
        ] },
      firm_trial: { say: 'A trial I can live with. But one day, not two.',
        choices: [
          { id: 'step', label: 'One day for the first 30 days, then two if the numbers hold, with the review on the calendar now.', tags: ['trade', 'lock'], flags: W, next: 'end_stepped',
            note: 'A stepped trial gets you to two on evidence rather than argument.' },
          { id: 'fine', label: 'Fine, one day.', tags: ['concede'], next: 'end_one',
            note: 'You took their number without a path to yours.' },
          { id: 'look', label: 'Then I will take one and keep my options open.', tags: ['batna', 'hostile'], rapport: -1, next: 'end_ultimatum',
            note: 'You signaled you are leaving, which changes how Priya treats every future ask.' }
        ] },
      hr: { say: 'HR is swamped. Maybe next quarter.',
        choices: [
          { id: 'start', label: 'I would rather not wait a quarter. Could we start a two-day trial next week while HR looks at policy, with a 90-day review? I will draft the email.', tags: ['trade', 'lock', 'anchor'], flags: W, next: 'end_two_trial',
            note: 'With a staller, offering to do the paperwork removes the excuse.' },
          { id: 'wait', label: 'Okay, next quarter then.', tags: ['concede'], next: 'end_later',
            note: '"Next quarter" from an evasive manager usually means never.' },
          { id: 'who', label: 'Who in HR decides? I can send them the pilot numbers myself.', tags: ['probe', 'evidence'], next: 'end_hr_route',
            note: 'Going around the stall works, but it is slower than closing it in the room.' }
        ] },
      end_nothing: { say: 'Okay. Thanks for stopping by.', outcome: { id: 'nothing', label: 'Nothing changed', value: 0, summary: 'Same schedule as before, and the topic is now harder to reopen.' } },
      end_later: { say: 'Great, let us revisit then.', outcome: { id: 'later', label: 'Pushed to next quarter', value: 0, summary: 'Nothing on paper, nothing on the calendar.' } },
      end_one: { say: 'One day works. Pick one.', outcome: { id: 'one', label: 'One remote day', value: 1, summary: 'Half your ask, with no path to more.' } },
      end_one_vague: { say: 'Let us start with one day and see how responsive you are.', outcome: { id: 'one_vague', label: 'One day, informal', value: 1, summary: 'An informal arrangement that can vanish with the next reorg.' } },
      end_ultimatum: { say: 'You can have one day. And I have noted what you said.', outcome: { id: 'ultimatum', label: 'One day, relationship dented', value: 1, rapport: -1, summary: 'You got something, but you are now the person who threatened to leave.' } },
      end_stepped: { say: 'Deal. Put the review on my calendar.', outcome: { id: 'stepped', label: 'Stepped trial: one day, then two', value: 1.5, summary: 'A firm manager agreed to a path to two days on evidence. A strong result.' } },
      end_hr_route: { say: 'Sure, send HR the numbers. One day while they decide.', outcome: { id: 'hr_route', label: 'One day now, two pending HR', value: 1.5, summary: 'Progress, but the final call is out of the room.' } },
      end_two_handshake: { say: 'Tell you what, try two days and we will see how it goes.', outcome: { id: 'two_handshake', label: 'Two days on a handshake', value: 2, summary: 'You got the days, but nothing in writing. A new manager could undo it.' } },
      end_two_trial: { say: 'Send me the email and we will start next week.', outcome: { id: 'two_trial', label: 'Two days, written 90-day trial', value: 2, rapport: 1, summary: 'Two days with a review date and a paper trail. The best result here.' } }
    }
  };

  const heat = {
    id: 'heat',
    title: 'The heat is out',
    domain: 'Home',
    difficulty: 'Intermediate',
    counterpart: { name: 'Gus Ferreira', role: 'your property manager' },
    brief: 'Your apartment heater died two days ago. It is November and it drops to 52 degrees inside at night. Gus says a tech can come "after the holiday, a couple of weeks." You want it fixed this week, with the date confirmed in writing.',
    you: { anchor: 'A technician by Thursday, two days from now', target: 'Fixed within 2 days', walkaway: 'A week. Past that you would buy space heaters and put a formal written request in.' },
    scale: { unit: v => { const d = -v; return d + (d === 1 ? ' day' : ' days') + ' until fixed'; }, walkaway: -7, target: -2, best: -2 },
    objectives: [
      { id: 'fast', label: 'Heat fixed within three days', kind: 'value-at-least', value: -3 },
      { id: 'written', label: 'Get the repair date confirmed in writing', kind: 'flag', flag: 'written' },
      { id: 'civil', label: 'Stay civil', kind: 'no-tag', tag: 'hostile' }
    ],
    drills: ['anchor', 'evidence', 'cool', 'lock'],
    start: 'start',
    nodes: {
      start: { say: 'Yeah, I got your message about the heater. We will get someone out there. Probably after the holiday, a couple of weeks.',
        choices: [
          { id: 'thursday', label: 'Two weeks without heat in November is not workable. I need a technician by Thursday.', tags: ['anchor'], next: 'push',
            note: 'A clear date resets the conversation from "a couple of weeks" to this week.' },
          { id: 'whenever', label: 'Okay, whenever you can.', tags: ['concede', 'accept_early'], next: 'end_twoweeks',
            note: 'You accepted two weeks in the cold without asking a single question.' },
          { id: 'holdup', label: 'What is holding it up on your side?', tags: ['probe'], next: 'reason',
            note: 'Finding the actual obstacle lets you solve it for them.' },
          { id: 'report', label: 'This is unacceptable. I am going to report you.', tags: ['hostile'], rapport: -2, next: 'heated',
            note: 'Starting with a threat makes Gus defend himself instead of finding a tech.' }
        ] },
      reason: { say: { cooperative: 'Honestly, my usual HVAC guy is booked solid.', firm: 'It is a busy season. Everyone wants heat right now.', evasive: 'Just a lot going on. It will get done.' },
        choices: [
          { id: 'other', label: 'If your usual tech is booked, would you approve another licensed company that can come this week? I can send you three options today.', tags: ['trade', 'evidence', 'anchor'],
            next: { cooperative: 'coop_lock', firm: 'firm_cost', evasive: 'evasive_push' },
            note: 'You did the legwork for him, which removes his main reason to wait.' },
          { id: 'understand', label: 'Okay, I understand. Two weeks then.', tags: ['concede'], next: 'end_twoweeks',
            note: 'You found the obstacle and then accepted it.' }
        ] },
      push: { say: { cooperative: 'Thursday is tight. Why the rush?', firm: 'I cannot promise Thursday. Best I can do is next week.', evasive: 'We will do our best. Cannot promise anything.' },
        choices: [
          { id: 'why', label: 'It is 52 degrees inside at night and my kid has a cold. That is why Thursday.', tags: ['evidence'],
            next: { cooperative: 'coop_lock', firm: 'firm_cost', evasive: 'evasive_push' },
            note: 'A concrete reason turns your date from a preference into a problem he has to solve.' },
          { id: 'nextweek', label: 'Next week is fine.', tags: ['concede'], next: 'end_nextweek',
            note: 'You gave up your date at the first pushback.' },
          { id: 'silence', label: '(Say nothing. Wait.)', tags: ['silence'],
            next: { cooperative: 'coop_lock', firm: 'firm_monday', evasive: 'evasive_push' },
            note: 'Silence pulled a better date out of him without you giving anything.' }
        ] },
      heated: { say: { cooperative: 'Hey, no need for that. Tell me what you need.', firm: 'Go ahead. It will still be two weeks.', evasive: 'I am not going to talk to you if you are yelling.' },
        choices: [
          { id: 'reset', label: 'You are right, let me reset. I need it fixed by Thursday, and here is why.', tags: ['anchor', 'evidence'], rapport: 1, next: 'push',
            note: 'Owning the outburst and restarting with a clear ask got you back on track.' },
          { id: 'city', label: 'Then I am calling the city right now.', tags: ['hostile'], rapport: -1, next: 'end_standoff',
            note: 'Outside help can be a real option, but used as a threat it turned a repair into a feud.' }
        ] },
      firm_cost: { say: 'Another company costs me more. I am not paying rush rates.',
        choices: [
          { id: 'easy', label: 'What if I handle the scheduling and let them in, so it costs you no time, and you approve a cap on the call-out fee? Can you confirm by text today?', tags: ['trade', 'lock', 'reframe'], flags: W, next: 'end_three_days',
            note: 'You made the fast option the easy option, and got it in writing.' },
          { id: 'wait', label: 'Okay, I will wait for your guy.', tags: ['concede'], next: 'end_nextweek',
            note: 'His cost objection had an answer, and you did not offer it.' },
          { id: 'log', label: 'Then I will log the temperature each night and send it to you in writing.', tags: ['batna'], next: 'firm_monday',
            note: 'A calm, specific alternative moved him without a threat.' }
        ] },
      firm_monday: { say: '... Fine. I can probably get someone Monday.',
        choices: [
          { id: 'confirm', label: 'Monday works if it is confirmed by text, with a time window, and a space heater until then.', tags: ['trade', 'lock'], flags: W, next: 'end_monday_written',
            note: '"Probably" became a confirmed window with a stopgap.' },
          { id: 'great', label: 'Great, Monday.', tags: ['accept_early'], next: 'end_monday',
            note: '"Probably Monday" with nothing in writing tends to become Wednesday.' }
        ] },
      evasive_push: { say: 'Yeah, I will look into it.',
        choices: [
          { id: 'byfive', label: 'To make it easy: can you text me a confirmed day by 5 today? If I do not hear back, I will email the request so we both have a record.', tags: ['lock', 'batna'], flags: W, next: 'end_monday_written',
            note: 'A deadline for a reply plus a calm paper-trail plan is the cure for "I will look into it."' },
          { id: 'thanks', label: 'Thanks, let me know.', tags: ['vague', 'concede'], next: 'end_drift',
            note: '"Let me know" from a staller means you will be asking again next week.' }
        ] },
      coop_lock: { say: 'Okay, I will call my backup company. Could be tomorrow or Thursday.',
        choices: [
          { id: 'text', label: 'Thank you. Could you text me the confirmed time once you have it? I will make sure someone is home.', tags: ['lock'], rapport: 1, flags: W, next: 'end_tomorrow',
            note: 'Friendly and locked. You made it easy for him to follow through.' },
          { id: 'ok', label: 'Great, thanks.', tags: [], next: 'end_thursday_loose',
            note: 'Fine result, but you will spend tomorrow chasing the time.' }
        ] },
      end_twoweeks: { say: 'Great, I will put you on the list.', outcome: { id: 'twoweeks', label: 'Two weeks in the cold', value: -14, summary: 'You buy space heaters and wait.' } },
      end_nextweek: { say: 'Next week then.', outcome: { id: 'nextweek', label: 'Next week, unconfirmed', value: -7, summary: 'A week of cold nights, right at your walk-away.' } },
      end_standoff: { say: 'Do what you have to do.', outcome: { id: 'standoff', label: 'Standoff', value: -10, rapport: -1, summary: 'The repair happens in ten days, and every request after this is a fight.' } },
      end_drift: { say: 'Will do.', outcome: { id: 'drift', label: 'Still waiting', value: -14, summary: 'Two weeks later you are asking again.' } },
      end_monday: { say: 'Monday. Probably.', outcome: { id: 'monday', label: 'Probably Monday', value: -6, summary: 'Monday slides to Tuesday afternoon.' } },
      end_monday_written: { say: 'Okay, I will text you the window.', outcome: { id: 'monday_written', label: 'Monday, confirmed in writing', value: -5, summary: 'Five days with a confirmed window and a stopgap heater. Good against a reluctant manager.' } },
      end_three_days: { say: 'Fine. Send me the company and I will confirm.', outcome: { id: 'three_days', label: 'Fixed in three days', value: -3, summary: 'You made the fast fix easy for him to approve.' } },
      end_thursday_loose: { say: 'Sure thing.', outcome: { id: 'thursday_loose', label: 'Thursday, after some chasing', value: -3, summary: 'Heat back Thursday, after two follow-up calls.' } },
      end_tomorrow: { say: 'Tomorrow at 10. I will text you.', outcome: { id: 'tomorrow', label: 'Fixed tomorrow, confirmed', value: -2, rapport: 1, summary: 'Heat back in a day and Gus thinks you are easy to work with.' } }
    }
  };

  const neighbor = {
    id: 'neighbor',
    title: 'Music through the ceiling',
    domain: 'Neighbors',
    difficulty: 'Advanced',
    counterpart: { name: 'Jordan Blake', role: 'your upstairs neighbor' },
    brief: 'Music from upstairs has been keeping you up most nights. Right now you get about two quiet nights a week. You have never met Jordan. You want quiet by 10:30 on weeknights, and you want to stay on good terms since you will share a stairwell for years.',
    you: { anchor: 'Quiet after 10 every weeknight', target: '5 quiet nights a week', walkaway: '3 quiet nights. Below that you would go to the building manager.' },
    scale: { unit: 'quiet nights a week', walkaway: 3, target: 5, best: 6 },
    objectives: [
      { id: 'nights', label: 'At least five quiet nights a week', kind: 'value-at-least', value: 5 },
      { id: 'written', label: 'Agree on a way to raise it without knocking (swap numbers)', kind: 'flag', flag: 'written' },
      { id: 'rapport', label: 'Stay on good terms', kind: 'rapport-at-least', value: 1 }
    ],
    drills: ['probe', 'cool', 'trade', 'lock', 'silence'],
    start: 'start',
    nodes: {
      start: { say: 'Hey. What is up?',
        choices: [
          { id: 'ask', label: 'Hi, I am from 2B downstairs. The music most nights has been keeping me up. Could we agree on quiet after 10 on weeknights?', tags: ['anchor'], next: 'react',
            note: 'Direct and specific. A good default.' },
          { id: 'loud', label: 'You are so loud every night. Some of us work.', tags: ['hostile'], rapport: -2, next: 'defend',
            note: 'Jordan now has to defend themselves before they can help you.' },
          { id: 'hello', label: 'Hi, I am from 2B. Do you have a minute? I wanted to ask about your schedule.', tags: ['probe'], rapport: 1, next: 'sched',
            note: 'Starting with curiosity buys goodwill and information.' }
        ] },
      sched: { say: { cooperative: 'Sure. I teach guitar online in the evenings, mostly 7 to 10, sometimes later on Fridays.', firm: 'My schedule is my business, but yeah, I play in the evenings.', evasive: 'Uh, it varies. Why?' },
        choices: [
          { id: 'fit', label: 'That helps. Sound carries straight down to my bedroom. Could we keep it to before 10 on weeknights, and Fridays are yours?', tags: ['anchor', 'trade'], next: 'react',
            note: 'You built your ask around their schedule and gave something up front.' },
          { id: 'nevermind', label: 'Oh, okay. Never mind then.', tags: ['concede'], next: 'end_nothing',
            note: 'You got the information and never made the ask.' }
        ] },
      defend: { say: { cooperative: 'Oh. I did not realize. What would help?', firm: 'I am allowed to play music in my own place.', evasive: 'Okay... I will keep it down.' },
        choices: [
          { id: 'reset', label: 'Sorry, I am short on sleep. Let me start over: could we agree on quiet after 10 on weeknights?', tags: ['anchor'], rapport: 1, next: 'react',
            note: 'The apology cost nothing and reopened the conversation.' },
          { id: 'manager', label: 'We will see what the building manager says.', tags: ['batna', 'hostile'], rapport: -1, next: 'end_cold',
            note: 'You jumped to your walk-away before trying to negotiate.' }
        ] },
      react: { say: { cooperative: 'Weeknights after 10, yeah, I can mostly do that. Some lessons run to 10:30 though.', firm: '10 is early. I would say midnight.', evasive: 'I will try to keep it down.' },
        choices: [
          { id: 'pads', label: 'What if I lend you some rug pads, or the amp comes off the floor? Then 10:30 on lesson nights could work.', tags: ['trade'],
            next: { cooperative: 'close', firm: 'firm', evasive: 'pin' },
            note: 'You solved part of their problem in exchange for your ask.' },
          { id: 'whatever', label: 'Okay, whatever works for you.', tags: ['concede', 'accept_early'], next: 'end_try',
            note: 'You handed the whole decision to Jordan.' },
          { id: 'hard', label: 'What makes 10 hard for you?', tags: ['probe'],
            next: { cooperative: 'close', firm: 'firm', evasive: 'pin' },
            note: 'A question instead of a counter keeps it collaborative.' }
        ] },
      firm: { say: 'Look, I teach. Evenings are when people are free.',
        choices: [
          { id: 'package', label: 'That makes sense. Lessons end by 10:30 Sunday through Thursday with the amp off the floor, and Friday and Saturday are yours until midnight. Can I text you if it runs late, so I do not have to knock?', tags: ['trade', 'lock'], flags: W, next: 'end_deal_firm',
            note: 'A package that respects their work and protects your weeknights. The best move against a firm neighbor.' },
          { id: 'mgr', label: 'Then I will talk to the building manager.', tags: ['batna'], next: 'firm_batna',
            note: 'Naming the alternative calmly moved Jordan, but cost you the chance to design the deal.' }
        ] },
      firm_batna: { say: 'Okay, okay. Eleven on weeknights. That is it.',
        choices: [
          { id: 'eleven_trade', label: 'Eleven works on lesson nights if the amp comes off the floor. Let us swap numbers so I can text instead of knocking.', tags: ['trade', 'lock'], flags: W, next: 'end_eleven_written',
            note: 'You turned a grudging concession into a working arrangement.' },
          { id: 'fine', label: 'Fine.', tags: ['accept_early'], next: 'end_eleven',
            note: 'Accepted, but with no way to follow up except knocking again.' }
        ] },
      close: { say: 'Deal. Rug pads would actually help my recordings too.',
        choices: [
          { id: 'swap', label: 'Great. Let us swap numbers, and I will text a quick summary so we both remember: quiet by 10:30 Sunday to Thursday.', tags: ['lock'], rapport: 1, flags: W, next: 'end_deal_best',
            note: 'You locked a friendly deal and set up an easy channel for next time.' },
          { id: 'saturday', label: 'Could Saturdays wrap by midnight too?', tags: ['anchor'], next: 'end_deal_six',
            note: 'You pushed for one more night and got it, but left with nothing written down.' },
          { id: 'thanks', label: 'Great, thanks.', tags: [], next: 'end_deal_handshake',
            note: 'A good deal on a handshake. It holds until the first late lesson.' }
        ] },
      pin: { say: 'Yeah, I will try.',
        choices: [
          { id: 'concrete', label: 'I appreciate it. To make it concrete: quiet by 10:30 Sunday to Thursday. Can I text you if it runs late, rather than knocking?', tags: ['lock', 'anchor'], flags: W, next: 'end_pinned',
            note: '"I will try" became a specific time and a channel.' },
          { id: 'ok', label: 'Thanks.', tags: ['vague'], next: 'end_try',
            note: '"I will try" with nothing specific usually lasts about a week.' },
          { id: 'warn', label: 'If it keeps happening, I will go to the building manager.', tags: ['batna', 'hostile'], rapport: -1, next: 'end_cold',
            note: 'A warning to someone who just agreed to try reads as hostile.' }
        ] },
      end_nothing: { say: 'Cool. See you around.', outcome: { id: 'nothing', label: 'Nothing changed', value: 2, summary: 'Still two quiet nights a week.' } },
      end_try: { say: 'Sure, I will try.', outcome: { id: 'try', label: '"I will try"', value: 3, summary: 'Some weeks are better, some are not. Right at your walk-away.' } },
      end_cold: { say: '(The door closes.)', outcome: { id: 'cold', label: 'Building manager involved', value: 4, rapport: -1, summary: 'A notice goes out and it gets quieter, but Jordan will not look at you in the stairwell.' } },
      end_eleven: { say: 'Fine.', outcome: { id: 'eleven', label: 'Eleven on weeknights', value: 4, summary: 'Better, but you are awake until eleven on lesson nights.' } },
      end_eleven_written: { say: 'Yeah, here is my number.', outcome: { id: 'eleven_written', label: 'Eleven, amp off the floor, numbers swapped', value: 4.5, summary: 'Quieter than it sounds, and you can text instead of knocking.' } },
      end_pinned: { say: 'Yeah, text me. That is fine.', outcome: { id: 'pinned', label: '10:30 weeknights, numbers swapped', value: 4.5, summary: 'Mostly holds. When it slips, a text fixes it.' } },
      end_deal_firm: { say: 'Okay. That is fair. Here is my number.', outcome: { id: 'deal_firm', label: 'Package deal: weeknights quiet, weekends theirs', value: 5, rapport: 1, summary: 'Five quiet nights and a neighbor who thinks you were reasonable.' } },
      end_deal_handshake: { say: 'Cool. See you around.', outcome: { id: 'deal_handshake', label: '10:30 weeknights, handshake', value: 5, summary: 'Five quiet nights until the first late lesson, then you are knocking again.' } },
      end_deal_best: { say: 'Perfect. Here is my number.', outcome: { id: 'deal_best', label: '10:30 weeknights, in writing, friends', value: 5, rapport: 1, summary: 'Five quiet nights, a text channel, and a neighbor who likes you.' } },
      end_deal_six: { say: 'Ha. Sure, midnight Saturdays.', outcome: { id: 'deal_six', label: 'Six quiet nights, handshake', value: 6, summary: 'More nights than you asked for, but nothing to point to if it slips.' } }
    }
  };

  return [deadline, remote, heat, neighbor];
});
