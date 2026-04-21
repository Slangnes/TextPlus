/**
 * Hello World - A minimal TextPlus Core example game.
 *
 * Demonstrates:
 * - Situation transitions and navigation
 * - Quality tracking (courage, inventory)
 * - Conditional text rendering based on qualities
 * - Multiple endings based on player choices
 *
 * Play this game to understand how to use the Core API directly.
 */

import type { GameConfig, QualityDefinition, SituationDefinition, GameEngine } from '@textplus/core';

export const helloWorldConfig: GameConfig = {
  title: 'Hello World - A TextPlus Adventure',
  initialSituation: 'start',

  qualities: {
    courage: {
      name: 'Courage',
      type: 'number',
      default: 5,
      min: 0,
      max: 10
    } as QualityDefinition,
    hasKey: {
      name: 'Has Key',
      type: 'boolean',
      default: false
    } as QualityDefinition,
    visitedCave: {
      name: 'Visited Cave',
      type: 'boolean',
      default: false
    } as QualityDefinition,
  },

  situations: {
    start: {
      id: 'start',
      title: 'A Crossroads',
      content: `
        <p>You stand at a crossroads in a mysterious forest. The air is crisp 
        and filled with the sounds of nature.</p>
        <p>To your left, you hear the faint sound of running water and see 
        daylight filtering through the trees.</p>
        <p>To your right, you see the mouth of a dark cave, and a cool breeze 
        emanates from within.</p>
      `,
      links: [
        {
          text: 'Head toward the stream (Safe)',
          target: 'stream',
          onChoose: undefined
        },
        {
          text: 'Enter the cave (Risky)',
          target: 'cave',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('courage', 1);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    stream: {
      id: 'stream',
      title: 'A Peaceful Stream',
      content: `
        <p>You find a beautiful stream flowing through the forest. The water 
        is clear and cold. You drink deeply and feel refreshed.</p>
        <p>As you sit by the water, you notice the afternoon sun beginning to 
        fade. You've spent much time here, and you feel at peace.</p>
        <p>You realize this is a good place to rest for the night.</p>
      `,
      tags: ['peaceful', 'water'],
      links: [
        {
          text: 'Rest here (Ending A: Peace)',
          target: 'ending-peace',
          onChoose: undefined
        },
        {
          text: 'Continue exploring',
          target: 'forest-deeper',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    cave: {
      id: 'cave',
      title: 'Inside the Cave',
      content: `
        <p>Your eyes adjust to the dim light as you enter the cave. The walls 
        glisten with moisture, and you hear the echo of dripping water.</p>
        <p>As you venture deeper, you spot something glinting in the darkness 
        ahead—a key of some kind, resting on a rocky outcropping.</p>
        <p>You must decide: risk going deeper to retrieve it, or turn back.</p>
      `,
      tags: ['dark', 'underground'],
      links: [
        {
          text: 'Retrieve the key (High courage)',
          target: 'cave-key',
          condition: ((engine: GameEngine): boolean => (engine.getQuality('courage') as number) >= 6) as any,
          onChoose: ((engine: GameEngine): void => {
            engine.setQuality('hasKey', true);
          }) as any
        },
        {
          text: 'Retrieve the key (Risky)',
          target: 'cave-collapse',
          condition: ((engine: GameEngine): boolean => (engine.getQuality('courage') as number) < 6) as any,
          onChoose: undefined
        },
        {
          text: 'Turn back to the crossroads',
          target: 'start',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    'cave-key': {
      id: 'cave-key',
      title: 'The Golden Key',
      content: `
        <p>You carefully make your way across the slippery rocks and grasp the key. 
        It's warm to the touch, and engraved with symbols you don't recognize.</p>
        <p>As you turn to leave, you notice a door in the cave wall that you hadn't 
        seen before—and the key seems to glow with a faint light.</p>
        <p>This key clearly opens something important.</p>
      `,
      tags: ['treasure', 'magical'],
      links: [
        {
          text: 'Open the mysterious door',
          target: 'ending-treasure',
          onChoose: undefined
        },
        {
          text: 'Keep the key and leave',
          target: 'ending-mystery',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    'cave-collapse': {
      id: 'cave-collapse',
      title: 'A Close Call',
      content: `
        <p>As you approach the key, rocks begin to crumble beneath your feet. 
        You scramble backward, heart pounding, as dust fills the air.</p>
        <p>The cave shakes, and you realize how close you came to disaster. 
        Your courage has grown from this narrow escape.</p>
        <p>You exit the cave, shaken but alive.</p>
      `,
      tags: ['danger', 'escape'],
      links: [
        {
          text: 'Head to the stream to recover',
          target: 'stream',
          onChoose: ((engine: GameEngine): void => {
            engine.mutateQuality('courage', 2);
          }) as any
        }
      ] as any[]
    } as SituationDefinition,

    'forest-deeper': {
      id: 'forest-deeper',
      title: 'Deeper into the Forest',
      content: `
        <p>You continue your walk into the forest, not yet ready to settle down. 
        The trees grow denser, and you feel as though you might be lost.</p>
        <p>Then, you come upon an old cabin, smoke rising from its chimney. 
        Should you approach? Turn back? Or try to find your way to the cave you passed earlier?</p>
      `,
      links: [
        {
          text: 'Approach the cabin',
          target: 'ending-cabin',
          onChoose: undefined
        },
        {
          text: 'Head back toward the cave',
          target: 'cave',
          onChoose: undefined
        }
      ] as any[]
    } as SituationDefinition,

    // ===== ENDINGS =====

    'ending-peace': {
      id: 'ending-peace',
      title: '✓ Ending: Peace',
      content: `
        <p><strong>You have found peace.</strong></p>
        <p>By the stream, under the stars, you found what many seek their whole lives: 
        a moment of true tranquility. The forest has given you a gift.</p>
        <p>Your courage: ${(engine: GameEngine) => Math.round(engine.getQuality('courage') as number)} / 10</p>
        <p style="color: #888; font-size: 0.9em;">THE END</p>
      `,
      tags: ['ending', 'good'],
      links: []
    } as SituationDefinition,

    'ending-treasure': {
      id: 'ending-treasure',
      title: '✓ Ending: Treasure Unlocked',
      content: `
        <p><strong>You have unlocked the treasure.</strong></p>
        <p>The door swings open, revealing a chamber filled with ancient artifacts 
        and mysteries. You've found something that should have stayed hidden... 
        or perhaps something meant to be found by the brave.</p>
        <p>Your courage: ${(engine: GameEngine) => Math.round(engine.getQuality('courage') as number)} / 10</p>
        <p style="color: #888; font-size: 0.9em;">THE END</p>
      `,
      tags: ['ending', 'best'],
      links: []
    } as SituationDefinition,

    'ending-mystery': {
      id: 'ending-mystery',
      title: '✓ Ending: The Mystery Endures',
      content: `
        <p><strong>You have chosen mystery over curiosity.</strong></p>
        <p>You leave the cave with the key, but not knowing what it opens. 
        Perhaps it's better this way. The mystery of the cave will live with you forever.</p>
        <p>Your courage: ${(engine: GameEngine) => Math.round(engine.getQuality('courage') as number)} / 10</p>
        <p style="color: #888; font-size: 0.9em;">THE END</p>
      `,
      tags: ['ending', 'good'],
      links: []
    } as SituationDefinition,

    'ending-cabin': {
      id: 'ending-cabin',
      title: '✓ Ending: Welcome',
      content: `
        <p><strong>You have found shelter and perhaps friendship.</strong></p>
        <p>An old woman answers the door and smiles warmly at you. "I've been 
        expecting you," she says. You're not sure what that means, but her 
        hospitality is genuine. Perhaps this journey has led you exactly where you needed to be.</p>
        <p>Your courage: ${(engine: GameEngine) => Math.round(engine.getQuality('courage') as number)} / 10</p>
        <p style="color: #888; font-size: 0.9em;">THE END</p>
      `,
      tags: ['ending', 'good'],
      links: []
    } as SituationDefinition,
  }
};
