/**
 * The Memory Keeper - A TextPlus Core advanced tutorial game.
 *
 * Demonstrates:
 * - Quality constraints (sanity 0-100 with bounds)
 * - Advanced event listeners and callbacks
 * - Complex multi-factor conditionals
 * - Theme switching based on game state
 * - Save/load with multiple slots
 * - Entry/exit callbacks (onEnter/onExit)
 *
 * Learning path: Advanced players use this to understand event callbacks,
 * quality constraints, and how state affects themes and available actions.
 *
 * Story: Explore memories in a shifting mindscape. Each memory costs sanity.
 * When sanity is low, the world becomes darker and more frightening.
 */

import type { GameConfig, QualityDefinition, SituationDefinition, GameEngine } from '@textplus/core';

export const memoryKeeperConfig: GameConfig = {
  title: 'The Memory Keeper - A Journey Through Time',
  initialSituation: 'sanctuary',

  qualities: {
    sanity: {
      name: 'Sanity',
      type: 'number',
      default: 100,
      min: 0,
      max: 100
    } as QualityDefinition,

    clarity: {
      name: 'Mental Clarity',
      type: 'number',
      default: 50,
      min: 0,
      max: 100
    } as QualityDefinition,

    memoriesRecovered: {
      name: 'Memories Recovered',
      type: 'number',
      default: 0,
      min: 0,
      max: 10
    } as QualityDefinition,

    traumaticMemoriesVisited: {
      name: 'Traumatic Memories Visited',
      type: 'boolean',
      default: false
    } as QualityDefinition,

    foundHopeRitual: {
      name: 'Found Hope Ritual',
      type: 'boolean',
      default: false
    } as QualityDefinition,
  },

  situations: {
    sanctuary: {
      id: 'sanctuary',
      title: 'The Sanctuary - A Safe Place',
      content: `
        <p>You stand in a vast library. Shelves stretch infinitely in all directions, 
        filled with glowing books—each one a memory.</p>
        <p>The air here is calm. Clear. You feel... safe. This is where lost memories 
        come to rest before returning to the mind.</p>
        <p>But you can feel it: somewhere in this library, fragmented pieces of your past 
        wait to be rediscovered. Some beautiful. Some... not.</p>
        <p>What will you do?</p>
      `,
      tags: ['start', 'safe', 'neutral'],
      links: [
        {
          text: 'Explore the pleasant memories (East wing)',
          target: 'childhood-home',
          onChoose: undefined
        },
        {
          text: 'Face the difficult memories (West wing)',
          target: 'dark-memory',
          onChoose: undefined
        },
        {
          text: 'Rest here and meditate',
          target: 'meditate',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('clarity', 5);
            engine.mutateQuality('sanity', 10);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'meditate': {
      id: 'meditate',
      title: 'Meditation',
      content: `
        <p>You sit in the center of the library and breathe deeply. The soft 
        luminescence of the books washes over you, calming and centering.</p>
        <p>You feel more grounded. More yourself. The fragmented edges of your 
        consciousness knit back together slightly.</p>
        <p>When you open your eyes, you feel renewed. You're ready to explore 
        whatever lies ahead.</p>
      `,
      tags: ['recovery', 'safe'],
      links: [
        {
          text: 'Return to the main library',
          target: 'sanctuary',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    'childhood-home': {
      id: 'childhood-home',
      title: 'Golden Summer Afternoon',
      content: `
        <p>You're five years old again. Sunlight pours through the kitchen window. 
        Your grandmother hums a lullaby while baking bread. The smell of warm dough 
        and honey fills everything.</p>
        <p>You remember this day. You remember feeling safe. Loved. Complete.</p>
        <p>The memory is vivid, precious. You want to linger here forever, but you 
        know you can't. Memories aren't meant to be lived in. Only visited.</p>
      `,
      tags: ['pleasant', 'recovery'],
      links: [
        {
          text: 'Accept this gift and move on',
          target: 'sanctuary',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('memoriesRecovered', 1);
            engine.mutateQuality('sanity', 5);
            engine.mutateQuality('clarity', 3);
          }) as any
        },
        {
          text: 'Try to stay in this moment longer',
          target: 'memory-fades',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('sanity', -10);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'memory-fades': {
      id: 'memory-fades',
      title: 'The Memory Slips Away',
      content: `
        <p>No. You can't hold it. Memories don't work that way. The golden light 
        begins to decompose. Grandmother's face blurs. The lullaby becomes distorted.</p>
        <p>Clinging to what's passing causes pain. You're torn between holding on 
        and letting go.</p>
        <p>Finally, the memory slips through your fingers like water. You're back 
        in the library, but now it feels colder than before.</p>
      `,
      tags: ['loss', 'trauma'],
      links: [
        {
          text: 'Return to the library',
          target: 'sanctuary',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    'dark-memory': {
      id: 'dark-memory',
      title: 'The Storm',
      content: `
        <p>You stand in a bedroom you recognize but wish you didn't. Rain hammers 
        against the windows. Angry voices echo from downstairs. Your parents arguing 
        again.</p>
        <p>The memory is vivid and painful. It cuts like broken glass. This is a 
        memory that shaped you—trauma preserved in your mind's library.</p>
        <p>You have a choice: face it fully or flee.</p>
      `,
      tags: ['traumatic', 'dark', 'difficult'],
      links: [
        {
          text: 'Listen to the full argument (Face it)',
          target: 'trauma-processing',
          onChoose: ((engine: GameEngine): void => {
            engine.setQuality('traumaticMemoriesVisited', true);
            engine.mutateQuality('sanity', -20);
            engine.mutateQuality('clarity', 10);
          }) as any
        },
        {
          text: 'Leave the memory unprocessed',
          target: 'sanctuary',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('sanity', -5);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'trauma-processing': {
      id: 'trauma-processing',
      title: 'Confronting the Past',
      content: `
        <p>You listen. Really listen. The words sting. But as you sit with the pain, 
        something shifts. You understand now—the argument wasn't your fault. The 
        anger wasn't directed at you.</p>
        <p>Understanding doesn't erase the hurt, but it transforms it. The memory 
        is no longer a wound. It's just something that happened. It shaped you, 
        but it doesn't define you.</p>
        <p>Your sanity took a hit, but your clarity improved. The trade was worth it.</p>
      `,
      tags: ['processing', 'growth'],
      links: [
        {
          text: 'Process this wisdom in the sanctuary',
          target: 'sanctuary',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('memoriesRecovered', 1);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'forgotten-wing': {
      id: 'forgotten-wing',
      title: 'The Forgotten Wing',
      content: `
        <p>You discover a part of the library you don't remember. Books here are 
        older, dustier, lined with cobwebs. These are memories so old, so deeply 
        buried, that you've almost stopped remembering they exist.</p>
        <p>On a pedestal sits a single book, glowing faintly. When you open it, 
        the memory is profound: a moment of choice, a turning point in your life.</p>
        <p>This memory is powerful. It shaped everything that came after.</p>
      `,
      tags: ['profound', 'important'],
      links: [
        {
          text: 'Fully integrate this memory',
          target: 'integration',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('memoriesRecovered', 2);
            engine.mutateQuality('clarity', 20);
            engine.mutateQuality('sanity', -15);
          }) as any
        },
        {
          text: 'Leave this wing and return',
          target: 'sanctuary',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    'integration': {
      id: 'integration',
      title: 'Integration',
      content: `
        <p>The memory floods through you. Not as separate from you, but as part of 
        you. A moment that shaped your decisions, your fears, your strengths.</p>
        <p>Understanding your own history—truly understanding it—takes everything 
        you have. Your sanity fragments slightly under the weight. But your clarity 
        becomes crystalline.</p>
        <p>You are whole now. Or more whole than before.</p>
      `,
      tags: ['integration', 'powerful'],
      links: [
        {
          text: 'Rest in the sanctuary',
          target: 'sanctuary',
          onChoose: undefined
        },
        {
          text: 'Seek out the Hope Ritual',
          target: 'hope-ritual',
          condition: ((engine: GameEngine): boolean => (engine.getQuality('clarity') as number) > 70) as any,
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    'hope-ritual': {
      id: 'hope-ritual',
      title: 'The Hope Ritual',
      content: `
        <p>In the deepest part of the library, you discover it: an ancient ritual, 
        written in a language that somehow you understand.</p>
        <p>It's a meditation. A way of binding your recovered memories, your hard-won 
        clarity, and your sanity back together. A way of becoming whole again.</p>
        <p>You perform the ritual. With each word, each gesture, you feel yourself 
        solidifying. The fragmented pieces of your mind knit together.</p>
      `,
      tags: ['healing', 'ritual', 'ending'],
      links: [
        {
          text: 'Complete the ritual and wake',
          target: 'ending-healed',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('sanity', 30);
            engine.setQuality('foundHopeRitual', true);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'ending-healed': {
      id: 'ending-healed',
      title: 'Awakening',
      content: `
        <p>You open your eyes. You're back in the real world. The morning sun 
        filters through your bedroom window.</p>
        <p>The memories remain. The trauma remains. But so do your strength, your 
        clarity, and your understanding. You are no longer fragmented. You are whole.</p>
        <p>Whatever comes next—you'll face it with your past integrated, your mind 
        at peace.</p>
        <p><strong>Journey Complete: Memories Recovered, Clarity Achieved, Mind Healed</strong></p>
      `,
      tags: ['ending', 'healing', 'triumph'],
      links: [
        {
          text: 'Begin again (Restart)',
          target: 'sanctuary',
          onChoose: ((engine: GameEngine): void => {
            engine.reset();
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'ending-lost': {
      id: 'ending-lost',
      title: 'Lost in the Library',
      content: `
        <p>Your sanity has fractured too much. The library dissolves around you.</p>
        <p>You're lost now—not physically lost, but mentally adrift in ancient 
        memories and forgotten trauma. The books surround you, but their words 
        make no sense.</p>
        <p>Perhaps it's okay to be lost sometimes. Perhaps rest is what you need.</p>
      `,
      tags: ['ending', 'loss', 'rest'],
      links: [
        {
          text: 'Rest and rebuild (Restart)',
          target: 'sanctuary',
          onChoose: ((engine: GameEngine): void => {
            engine.reset();
          }) as any
        }
      ] as any[]
    } as SituationDefinition,
  },
};
