/**
 * The Detective's Case - A TextPlus Core intermediate tutorial game.
 *
 * Demonstrates:
 * - Event listeners (onQualityChange, onSituationChange)
 * - Situation history tracking (hasSituationBeenVisited, getSituationHistory)
 * - Multiple quality types (number, boolean)
 * - Conditional link display based on player progress
 * - Save/load gameplay state
 *
 * Learning path: After Hello World, this game shows how to track player state
 * across the session using events and history APIs.
 */

import type { GameConfig, QualityDefinition, SituationDefinition, GameEngine } from '@textplus/core';

export const detectiveCaseConfig: GameConfig = {
  title: 'The Detective\'s Case - A TextPlus Investigation',
  initialSituation: 'office-start',

  qualities: {
    investigationScore: {
      name: 'Investigation Score',
      type: 'number',
      default: 0,
      min: 0,
      max: 100
    } as QualityDefinition,

    foundWeapon: {
      name: 'Found Weapon',
      type: 'boolean',
      default: false
    } as QualityDefinition,

    foundNote: {
      name: 'Found Note',
      type: 'boolean',
      default: false
    } as QualityDefinition,

    spokeToWitness: {
      name: 'Spoke to Witness',
      type: 'boolean',
      default: false
    } as QualityDefinition,

    suspicion: {
      name: 'Suspicion Level',
      type: 'number',
      default: 0,
      min: 0,
      max: 100
    } as QualityDefinition,
  },

  situations: {
    'office-start': {
      id: 'office-start',
      title: 'Detective\'s Office',
      content: `
        <p>You sit at your desk, rain pattering against the window. A case file 
        lands in front of you with a thud.</p>
        <p>"There's been a break-in at the gallery downtown," your captain says. 
        "Three pieces missing. We need answers."</p>
        <p>You open the file. The crime occurred at midnight. No signs of forced entry. 
        The owner claims they were asleep upstairs.</p>
        <p>Where will you start your investigation?</p>
      `,
      tags: ['start', 'investigation'],
      links: [
        {
          text: 'Go to the crime scene (Gallery)',
          target: 'crime-scene',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 10);
          }) as any
        },
        {
          text: 'Interview the owner first (Home)',
          target: 'owner-home',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 5);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'crime-scene': {
      id: 'crime-scene',
      title: 'The Gallery - Crime Scene',
      content: `
        <p>You arrive at the gallery. Police tape marks off the main floor. 
        The display cases where the pieces hung now stand empty, glass unbroken.</p>
        <p>On the floor beneath one case, you spot something glinting: a small brass key.</p>
        <p>"No forced entry," the officer confirms. "Whoever did this had access."</p>
      `,
      tags: ['location', 'evidence'],
      links: [
        {
          text: 'Take the key (Major clue)',
          target: 'key-found',
          onChoose: ((engine: GameEngine): void => {
            engine.setQuality('foundWeapon', true);
            engine.mutateQuality('investigationScore', 15);
          }) as any
        },
        {
          text: 'Examine the display cases',
          target: 'examine-cases',
          onChoose: undefined
        },
        {
          text: 'Return to the office',
          target: 'office-start',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    'key-found': {
      id: 'key-found',
      title: 'A Crucial Discovery',
      content: `
        <p>The key feels warm in your hand. Ornate. Old. You turn it over, analyzing.</p>
        <p>"This isn't a modern key," you mutter to the officer. "It's antique. 
        Someone had easy access—they had this."</p>
        <p>The suspicion meter in your mind ticks upward. The owner claimed a break-in, 
        but what if they were involved?</p>
      `,
      tags: ['evidence', 'revelation'],
      links: [
        {
          text: 'Confront the owner about this key',
          target: 'confront-owner',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('suspicion', 25);
          }) as any
        },
        {
          text: 'Search for where this key fits',
          target: 'search-hideout',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 10);
          }) as any
        },
        {
          text: 'Interview the witness (Janitor)',
          target: 'interview-janitor',
          onChoose: ((engine: GameEngine): void => {
            engine.setQuality('spokeToWitness', true);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'examine-cases': {
      id: 'examine-cases',
      title: 'The Display Cases',
      content: `
        <p>You run your fingers along the glass edges. No scratches, no tampering. 
        The locks are intact—they were opened from the inside.</p>
        <p>"Whoever took these paintings knew exactly how to open these cases," 
        you realize. "This wasn't a smash-and-grab."</p>
      `,
      tags: ['investigation', 'clue'],
      links: [
        {
          text: 'Return to office',
          target: 'office-start',
          onChoose: undefined
        },
        {
          text: 'Continue searching the gallery',
          target: 'gallery-storage',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 5);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'gallery-storage': {
      id: 'gallery-storage',
      title: 'The Storage Room',
      content: `
        <p>Behind crates and covered paintings, you find a workbench. On it: 
        sketches of the stolen paintings and a half-burned letter.</p>
        <p>You can make out words: "...insurance claim..." and "...split three ways..."</p>
        <p>Your pulse quickens. This is bigger than simple theft.</p>
      `,
      tags: ['major-clue', 'conspiracy'],
      links: [
        {
          text: 'Recover the note (Strong evidence)',
          target: 'found-note',
          onChoose: ((engine: GameEngine): void => {
            engine.setQuality('foundNote', true);
            engine.mutateQuality('investigationScore', 25);
            engine.mutateQuality('suspicion', 40);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'found-note': {
      id: 'found-note',
      title: 'The Conspiracy Unfolds',
      content: `
        <p>The note is insurance fraud combined with theft. The owner is definitely involved. 
        But who else?</p>
        <p>You have enough to bring them in for questioning. But first... should you 
        gather more evidence? Or move now?</p>
      `,
      tags: ['turning-point', 'choice'],
      links: [
        {
          text: 'Arrest them immediately',
          target: 'ending-arrest',
          condition: ((engine: GameEngine): boolean => (engine.getQuality('suspicion') as number) > 50) as any,
          onChoose: undefined
        },
        {
          text: 'Interview the janitor first',
          target: 'interview-janitor',
          onChoose: ((engine: GameEngine): void => {
            engine.setQuality('spokeToWitness', true);
          }) as any
        },
        {
          text: 'Confront the owner with evidence',
          target: 'confront-owner',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    'interview-janitor': {
      id: 'interview-janitor',
      title: 'The Janitor\'s Story',
      content: `
        <p>"I saw the owner that night," the janitor says nervously. "Around midnight. 
        They said they were checking inventory, but I found this in the trash."</p>
        <p>A security system bypass card. If they had this, they could disable the alarm 
        without triggering it.</p>
      `,
      tags: ['witness', 'breakthrough'],
      links: [
        {
          text: 'Arrest the owner with full evidence',
          target: 'ending-arrest',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 30);
          }) as any
        },
        {
          text: 'Investigate the accomplice',
          target: 'find-accomplice',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 20);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'confront-owner': {
      id: 'confront-owner',
      title: 'Confrontation',
      content: `
        <p>You corner the owner. "The key. The broken lock. The storage room. You were involved."</p>
        <p>Their face goes pale. After a moment, they laugh helplessly.</p>
        <p>"Yes. But I wasn't the only one. There's someone else."</p>
      `,
      tags: ['confrontation', 'decision'],
      links: [
        {
          text: 'Press for the name',
          target: 'find-accomplice',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 15);
          }) as any
        },
        {
          text: 'Arrest them now',
          target: 'ending-partial',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    'find-accomplice': {
      id: 'find-accomplice',
      title: 'The Accomplice Revealed',
      content: `
        <p>"It was my business partner," they confess. "They handled the security system. 
        I provided the rare paintings to 'steal.' We split the insurance money three ways—
        me, them, and a corrupt adjuster."</p>
        <p>You have the full conspiracy now. This case is solved.</p>
      `,
      tags: ['resolution', 'complete'],
      links: [
        {
          text: 'Arrest all three (Perfect ending)',
          target: 'ending-perfect',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 100);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'owner-home': {
      id: 'owner-home',
      title: 'The Owner\'s Home',
      content: `
        <p>The owner answers in a silk robe, looking tired. "Detective, I already told 
        the police everything. It was a break-in."</p>
        <p>But you notice their hands are stained with fresh ink or paint.</p>
        <p>"What were you doing at midnight?" you ask.</p>
        <p>They hesitate too long. "Sleeping. Alone."</p>
        <p>Your instincts scream. Something's wrong.</p>
      `,
      tags: ['interview', 'suspicion'],
      links: [
        {
          text: 'Push on the stains',
          target: 'confront-owner',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('suspicion', 50);
          }) as any
        },
        {
          text: 'Go to the crime scene',
          target: 'crime-scene',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 10);
          }) as any
        },
        {
          text: 'Search their home',
          target: 'search-home',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 5);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'search-home': {
      id: 'search-home',
      title: 'An Unauthorized Search',
      content: `
        <p>While they're in the kitchen, you slip upstairs. Under the bed, you find 
        a leather briefcase: stacks of cash and gallery security blueprints.</p>
        <p>Premeditation. Without a warrant, this search is illegal. But you have what 
        you need to get one.</p>
      `,
      tags: ['evidence', 'breakthrough'],
      links: [
        {
          text: 'Get a warrant and arrest',
          target: 'ending-arrest',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 50);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'search-hideout': {
      id: 'search-hideout',
      title: 'Following the Key',
      content: `
        <p>The antique key feels like a puzzle. You visit antique dealers. Finally, 
        one recognizes it: a safety deposit box key from the old bank on 5th Street.</p>
        <p>You find the vault. Your key fits box 147.</p>
      `,
      tags: ['mystery', 'key'],
      links: [
        {
          text: 'Open the box',
          target: 'open-box',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 20);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'open-box': {
      id: 'open-box',
      title: 'Inside the Vault',
      content: `
        <p>Journals documenting years of planning. The owner. A partner. An insurance agent. 
        A coordinated conspiracy going back two years.</p>
        <p>You photograph every page. This is irrefutable evidence.</p>
      `,
      tags: ['smoking-gun', 'resolution'],
      links: [
        {
          text: 'Arrest all involved (Perfect ending)',
          target: 'ending-perfect',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('investigationScore', 100);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'ending-arrest': {
      id: 'ending-arrest',
      title: 'Case Closed - Arrest Made',
      content: `
        <p>You place the handcuffs on their wrists. "You have the right to remain silent..."</p>
        <p>Back at the station, they lawyer up. Without finding the other conspirators, 
        the case is incomplete. But at least one person is in custody.</p>
        <p>Your captain nods. "Good work, Detective. Not perfect, but solid."</p>
        <p><strong>Case Status: Partially Solved</strong></p>
      `,
      tags: ['ending', 'partial'],
      links: [
        {
          text: 'Close the case (Restart)',
          target: 'office-start',
          onChoose: ((engine: GameEngine): void => {
            engine.reset();
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'ending-partial': {
      id: 'ending-partial',
      title: 'Case Closed - Incomplete',
      content: `
        <p>The owner sits smirking. "You got me, but you don't have enough for the others. 
        Good luck proving anything without my cooperation."</p>
        <p>One person arrested. The rest escape.</p>
        <p>Your captain sighs. "We'll keep looking. But for now, this is as far as we go."</p>
        <p><strong>Case Status: Incomplete</strong></p>
      `,
      tags: ['ending', 'unsatisfying'],
      links: [
        {
          text: 'Return to your desk (Restart)',
          target: 'office-start',
          onChoose: ((engine: GameEngine): void => {
            engine.reset();
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'ending-perfect': {
      id: 'ending-perfect',
      title: 'Case Closed - Full Resolution',
      content: `
        <p>Three arrests. All evidence documented. The paintings recovered and returned. 
        The insurance fraud exposed. The corrupt adjusters identified.</p>
        <p>Your captain personally commends you. "Outstanding detective work. You followed 
        every lead and solved the entire conspiracy."</p>
        <p>As you leave the station that evening, the rain has stopped. The city looks cleaner. 
        Another case, off the books.</p>
        <p>On your desk tomorrow: three new case files. But tonight, you rest well.</p>
        <p><strong>Case Status: PERFECT - All Conspirators Caught</strong></p>
      `,
      tags: ['ending', 'perfect', 'triumph'],
      links: [
        {
          text: 'Start a new case (Restart)',
          target: 'office-start',
          onChoose: ((engine: GameEngine): void => {
            engine.reset();
          }) as any
        }
      ] as any[]
    } as SituationDefinition,
  },
};
