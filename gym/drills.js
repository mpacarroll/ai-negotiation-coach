/* Targeted drills. Each drill trains one skill the rubric measures, and points to the free
   Negotiation Room tool and the matching Scripts Pack rule or script by name.
   `skills` lists rubric criterion ids and move tags the drill fixes; the debrief recommends a
   drill when one of those is weak in a run. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.NCGym = root.NCGym || {}; root.NCGym.drills = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return [
    { id: 'anchor', title: 'Say the number, then stop', skills: ['anchor', 'craft', 'outcome'],
      prompt: 'Your landlord asks what you were hoping for on the renewal. Which reply anchors best?',
      options: [
        { text: 'Something reasonable, whatever you think is fair.', correct: false, why: 'No number means their number becomes the anchor.' },
        { text: 'I would like to hold the rent where it is, at $2,100. (Then stop talking.)', correct: true, why: 'A specific number, then silence. The range is now set around yours.' },
        { text: 'I was thinking maybe $2,100, but I could probably go a bit higher if I had to.', correct: false, why: 'You negotiated against yourself in the same breath.' }
      ],
      practice: 'Out loud, three times: say your number, then count to five in your head before saying anything else.',
      material: { label: 'Build your anchor, target and walk-away', href: '../tool/#rent' },
      pack: 'Scripts Pack: rule 1, "Say the number, then stop talking"' },
    { id: 'probe', title: 'Ask before you answer', skills: ['probe', 'craft'],
      prompt: 'Your manager says, "I need this by Friday." What is the best first reply?',
      options: [
        { text: 'Friday is impossible.', correct: false, why: 'You argued against a position before learning what is behind it.' },
        { text: 'Sure, I will make it work.', correct: false, why: 'You agreed before knowing whether Friday is real.' },
        { text: 'Happy to look at it. What is driving Friday?', correct: true, why: 'The reason behind the date often has a cheaper answer than the date itself.' }
      ],
      practice: 'Write three "what is driving that?" questions for your next real conversation.',
      material: { label: 'Prep a raise conversation', href: '../tool/#salary' },
      pack: 'Scripts Pack: rule 3, "Put the problem on their side"' },
    { id: 'trade', title: 'Trade, do not give', skills: ['concede', 'discipline', 'trade'],
      prompt: 'They will not move on your number. You are willing to give a little. How do you say it?',
      options: [
        { text: 'Okay, I can come down a bit.', correct: false, why: 'A free concession teaches them that pushing works.' },
        { text: 'I can move on the date if we move the archive work to a phase two.', correct: true, why: 'Every concession is conditional: "I can do X if you do Y."' },
        { text: 'Fine, you win.', correct: false, why: 'You gave everything and got nothing back.' }
      ],
      practice: 'Finish this sentence five ways for your situation: "I can do ___ if you can do ___."',
      material: { label: 'Rehearse it with the Negotiation Room', href: '../tool/#salary' },
      pack: 'Scripts Pack: rule 2, "Never negotiate against yourself"' },
    { id: 'silence', title: 'Hold the silence', skills: ['silence', 'discipline'],
      prompt: 'You just made your ask. They say nothing for five seconds. What do you do?',
      options: [
        { text: 'Fill the gap: "Or, I mean, whatever works for you."', correct: false, why: 'Filling silence is the most common way people lower their own ask.' },
        { text: 'Wait. Let them speak first.', correct: true, why: 'Silence is pressure on them, not you. Their next words are often an improvement.' },
        { text: 'Repeat your reasons, louder.', correct: false, why: 'Re-arguing sounds like doubt.' }
      ],
      practice: 'Time yourself holding eye contact and silence for eight seconds. It feels long. It is not.',
      material: { label: 'Rehearse with an AI that pushes back', href: '../tool/#bill' },
      pack: 'Scripts Pack: rule 1, "Say the number, then stop talking"' },
    { id: 'lock', title: 'Lock it in', skills: ['lock', 'objectives'],
      prompt: 'They just said yes out loud. What is the next move?',
      options: [
        { text: 'Say thanks and leave before they change their mind.', correct: false, why: 'A verbal yes with no record is the easiest kind to undo.' },
        { text: 'Thanks. I will send a quick email summarizing what we agreed so we are on the same page.', correct: true, why: 'A short written summary turns a yes into an agreement.' },
        { text: 'Ask for more now that they are agreeing.', correct: false, why: 'Push past a clean yes and you can lose it. Lock first.' }
      ],
      practice: 'Draft a three-line summary email: what was agreed, by when, and the next check-in.',
      material: { label: 'Build your plan in the Negotiation Room', href: '../tool/#salary' },
      pack: 'Scripts Pack: script 39, "The written summary after a verbal yes"' },
    { id: 'cool', title: 'Cool it down and restart', skills: ['hostile', 'relationship'],
      prompt: 'You snapped: "This is ridiculous." They stiffen. What now?',
      options: [
        { text: 'Double down so you do not look weak.', correct: false, why: 'Now they are defending their pride, not solving your problem.' },
        { text: 'Sorry, that came out wrong. Let me start again: here is what I need, and why.', correct: true, why: 'A quick reset recovers most of the damage and costs you nothing.' },
        { text: 'Go quiet and drop it.', correct: false, why: 'You keep the damage and lose the ask.' }
      ],
      practice: 'Write your reset line now, so you have it ready: "Sorry, let me start again..."',
      material: { label: 'Rehearse a tough counterpart', href: '../tool/#rent' },
      pack: 'Scripts Pack: script 32, "They get personal or irritated"' },
    { id: 'batna', title: 'Name your alternative calmly', skills: ['batna', 'outcome'],
      prompt: 'They will not move and you do have another option. How do you mention it?',
      options: [
        { text: 'Do this or I am leaving.', correct: false, why: 'An ultimatum forces them to call it or lose face.' },
        { text: 'I would rather make this work. If we cannot, my other option is X, and I would like to decide by Friday.', correct: true, why: 'Calm, specific, and it keeps the door open.' },
        { text: 'Never mention it.', correct: false, why: 'An alternative they do not know about cannot move them.' }
      ],
      practice: 'Write your walk-away in one sentence. If you cannot, you do not have one yet.',
      material: { label: 'Set your walk-away', href: '../tool/#salary' },
      pack: 'Scripts Pack: script 19, "You genuinely would move"' },
    { id: 'evidence', title: 'Lead with evidence', skills: ['evidence', 'craft'],
      prompt: 'Which version of the ask is strongest?',
      options: [
        { text: 'I really feel I deserve this.', correct: false, why: 'Feelings are easy to sympathize with and easy to decline.' },
        { text: 'My output was up 20% during the pilot, so I would like to make it permanent.', correct: true, why: 'A fact they can repeat to their own boss makes yes easier.' },
        { text: 'Everyone else has it.', correct: false, why: 'Comparisons start an argument about other people.' }
      ],
      practice: 'List your three strongest facts. Lead with the one your counterpart cares about most.',
      material: { label: 'Turn your evidence into scripts', href: '../tool/#salary' },
      pack: 'Scripts Pack: script 7, "The opening"' }
  ];
});
