/**
 * TextPlus Workbench - Example Stories
 *
 * Every example doubles as living documentation of the DSL and must always
 * compile with zero errors and zero warnings (guarded by examples.test.ts).
 *
 * The three demo-game adaptations mirror packages/demo/*. The DSL cannot yet
 * express quality mutations or link conditions (Author Phase 2B), so those
 * mechanics are flattened: condition-gated links always show, and qualities
 * are kept only where the prose naturally references them.
 */

export interface ExampleStory {
  id: string;
  label: string;
  source: string;
}

export const BLANK_TEMPLATE = `title: Untitled Story

:: start [start]
An Opening
Write your opening scene here.

-> Continue => next

:: next
What Happens Next
And here, what happens next.
`;

const DUSTY_ARCHIVE = `title: The Dusty Archive

quality curiosity number = 1 min 0 max 10
quality lantern boolean = false

:: start [start]
The Reading Room
Dust motes drift through amber light. A brass lantern sits on the desk beside a card catalogue whose drawers are labeled in a language you almost remember. Your curiosity stirs.

-> Take the lantern and descend => stacks
-> Search the card catalogue => catalogue

:: catalogue
The Card Catalogue
The drawer slides open with a sigh. A single card reads: "Filed under regret. See lower stacks." The lantern still waits on the desk.

-> Take the lantern and descend => stacks

:: stacks
The Lower Stacks
Lantern light sways across shelves that lean like tired old men. Somewhere below, a page turns by itself. The stairs continue down; a reading alcove glows faintly to your left.

-> Follow the sound of turning pages => vault
-> Rest in the alcove => alcove

:: alcove
The Alcove
An armchair, a blanket, and a book left open at its final page: "...and the archive kept them, as it keeps everything." You could sleep here. You probably should not.

-> Descend after all => vault
-> Sleep, and end the story => ending-sleep

:: vault
The Vault of Returns
Every book ever lost, mis-shelved, or unreturned rests here. At the center an empty shelf bears your name, your lantern already glowing upon it. Curiosity has led you exactly where the archive wanted.

-> Shelve yourself among the stories => ending-shelved
-> Flee up the stairs => ending-flee

:: ending-sleep
Ending: The Reader Rests
You wake in the reading room at closing time, the lantern cold beside you. Some doors only open once. THE END

:: ending-shelved
Ending: Acquired
The archive files you gently, curiosity and all. You have always been here. THE END

:: ending-flee
Ending: Overdue
You burst into daylight, heart pounding, still holding the lantern. It will be counted as overdue. They will come for it. THE END
`;

const HELLO_WORLD = `title: Hello World - A TextPlus Adventure

quality courage number = 5 min 0 max 10

:: start [start]
A Crossroads
You stand at a crossroads in a mysterious forest. To your left you hear the faint sound of running water and see daylight filtering through the trees. To your right yawns the mouth of a dark cave, a cool breeze drifting from within. It would take some courage to enter.

-> Head toward the stream (Safe) => stream
-> Enter the cave (Risky) => cave

:: stream
A Peaceful Stream
You find a beautiful stream flowing through the forest. The water is clear and cold, and you drink deeply. As the afternoon sun begins to fade you realize this would be a good place to rest for the night.

-> Rest here (Ending A: Peace) => ending-peace
-> Continue exploring => forest-deeper

:: cave
Inside the Cave
Your eyes adjust to the dim light. The walls glisten with moisture, and deeper in you spot something glinting on a rocky outcropping: a key. Retrieving it will test your courage.

-> Retrieve the key (High courage) => cave-key
-> Retrieve the key (Risky) => cave-collapse
-> Turn back to the crossroads => start

:: cave-key
The Golden Key
You cross the slippery rocks and grasp the key. It is warm to the touch, engraved with symbols you do not recognize. As you turn to leave, you notice a door in the cave wall you had not seen before, and the key glows faintly.

-> Open the mysterious door => ending-treasure
-> Keep the key and leave => ending-mystery

:: cave-collapse
A Close Call
As you approach the key, rocks crumble beneath your feet. You scramble backward as dust fills the air. You exit shaken but alive, and your courage has grown from the narrow escape.

-> Head to the stream to recover => stream

:: forest-deeper
Deeper into the Forest
The trees grow denser and you begin to feel lost. Then you come upon an old cabin, smoke rising from its chimney. Approach? Or find your way back to that cave you passed?

-> Approach the cabin => ending-cabin
-> Head back toward the cave => cave

:: ending-peace
Ending: Peace
By the stream, under the stars, you find what many seek their whole lives: a moment of true tranquility. The forest has given you a gift. THE END

:: ending-treasure
Ending: Treasure Unlocked
The door swings open on a chamber of ancient artifacts and mysteries — something meant to be found by the brave, or something that should have stayed hidden. THE END

:: ending-mystery
Ending: The Mystery Endures
You leave with the key but never learn what it opens. Perhaps it is better this way. The mystery of the cave will live with you forever. THE END

:: ending-cabin
Ending: Welcome
An old woman answers the door and smiles warmly. "I've been expecting you," she says. Perhaps this journey has led you exactly where you needed to be. THE END
`;

const DETECTIVE_CASE = `title: The Detective's Case - A TextPlus Investigation

quality suspicion number = 0 min 0 max 100
quality evidence number = 0 min 0 max 100

:: office-start [start]
Detective's Office
Rain patters against the window as a case file lands on your desk. "There's been a break-in at the gallery downtown," your captain says. "Three pieces missing." The crime occurred at midnight, no signs of forced entry, and the owner claims they were asleep upstairs. Where will you start?

-> Go to the crime scene (Gallery) => crime-scene
-> Interview the owner first (Home) => owner-home

:: crime-scene
The Gallery - Crime Scene
Police tape marks off the main floor. The display cases stand empty, glass unbroken. Beneath one case something glints: a small brass key. "No forced entry," the officer confirms. "Whoever did this had access."

-> Take the key (Major clue) => key-found
-> Examine the display cases => examine-cases
-> Return to the office => office-start

:: key-found
A Crucial Discovery
The key is antique, ornate, warm in your hand. Someone had easy access — they had this. The suspicion in your mind ticks upward: the owner claimed a break-in, but what if they were involved?

-> Confront the owner about this key => confront-owner
-> Search for where this key fits => search-hideout
-> Interview the witness (Janitor) => interview-janitor

:: examine-cases
The Display Cases
No scratches, no tampering, locks intact — the cases were opened from the inside. Whoever took the paintings knew exactly how. This was not a smash-and-grab.

-> Return to office => office-start
-> Continue searching the gallery => gallery-storage

:: gallery-storage
The Storage Room
Behind crates you find a workbench with sketches of the stolen paintings and a half-burned letter. You can make out "...insurance claim..." and "...split three ways..." This is bigger than simple theft.

-> Recover the note (Strong evidence) => found-note

:: found-note
The Conspiracy Unfolds
The note points to insurance fraud combined with theft. The owner is involved — but who else? You have enough evidence to bring them in. Gather more first, or move now?

-> Arrest them immediately => ending-arrest
-> Interview the janitor first => interview-janitor
-> Confront the owner with evidence => confront-owner

:: interview-janitor
The Janitor's Story
"I saw the owner that night," the janitor says nervously. "Around midnight. They said they were checking inventory, but I found this in the trash." A security bypass card — with it, the alarm could be disabled without a trace.

-> Arrest the owner with full evidence => ending-arrest
-> Investigate the accomplice => find-accomplice

:: confront-owner
Confrontation
You corner the owner. "The key. The storage room. You were involved." Their face goes pale, and after a moment they laugh helplessly. "Yes. But I wasn't the only one. There's someone else."

-> Press for the name => find-accomplice
-> Arrest them now => ending-partial

:: find-accomplice
The Accomplice Revealed
"It was my business partner," they confess. "They handled security. I provided the paintings to 'steal.' We split the insurance money three ways — me, them, and a corrupt adjuster." You have the full conspiracy now.

-> Arrest all three (Perfect ending) => ending-perfect

:: owner-home
The Owner's Home
The owner answers in a silk robe. "Detective, I already told the police everything. It was a break-in." But their hands are stained with fresh ink or paint, and when you ask what they were doing at midnight, they hesitate too long. Your suspicion grows.

-> Push on the stains => confront-owner
-> Go to the crime scene => crime-scene
-> Search their home => search-home

:: search-home
An Unauthorized Search
While they brew coffee you slip upstairs. Under the bed: a briefcase of cash and gallery security blueprints. Premeditation. Without a warrant this search is illegal — but now you know what evidence to ask the judge for.

-> Get a warrant and arrest => ending-arrest

:: search-hideout
Following the Key
Antique dealers pass you along until one recognizes it: a safety deposit key from the old bank on 5th Street. In the vault, your key fits box 147.

-> Open the box => open-box

:: open-box
Inside the Vault
Journals documenting two years of planning: the owner, a partner, an insurance agent. You photograph every page. Irrefutable evidence.

-> Arrest all involved (Perfect ending) => ending-perfect

:: ending-arrest
Case Closed - Arrest Made
The handcuffs click. Back at the station they lawyer up, and without the other conspirators the case is incomplete — but one person is in custody. "Good work, Detective," your captain nods. "Not perfect, but solid."

-> Close the case (Restart) => office-start

:: ending-partial
Case Closed - Incomplete
The owner smirks. "You got me, but you'll never prove the rest without my cooperation." One arrested; the others escape. "We'll keep looking," your captain sighs. "But for now, this is as far as we go."

-> Return to your desk (Restart) => office-start

:: ending-perfect
Case Closed - Full Resolution
Three arrests, the paintings recovered, the fraud exposed, the corrupt adjuster identified. Your captain personally commends you. As you leave the station, the rain has stopped and the city looks cleaner. Tonight, you rest well.

-> Start a new case (Restart) => office-start
`;

const MEMORY_KEEPER = `title: The Memory Keeper - A Journey Through Time

quality sanity number = 100 min 0 max 100
quality clarity number = 50 min 0 max 100

:: sanctuary [start]
The Sanctuary - A Safe Place
You stand in a vast library, shelves stretching infinitely, filled with glowing books — each one a memory. The air is calm and your mind feels clear. Somewhere in this library, fragments of your past wait to be rediscovered. Some beautiful. Some not.

-> Explore the pleasant memories (East wing) => childhood-home
-> Face the difficult memories (West wing) => dark-memory
-> Rest here and meditate => meditate

:: meditate
Meditation
You sit at the center of the library and breathe. The soft luminescence of the books washes over you, and the fragmented edges of your sanity knit back together slightly. When you open your eyes you feel renewed.

-> Return to the main library => sanctuary

:: childhood-home
Golden Summer Afternoon
You are five years old again. Sunlight pours through the kitchen window while your grandmother hums and bakes bread. You remember feeling safe. Loved. You want to linger forever, but memories are not meant to be lived in. Only visited.

-> Accept this gift and move on => sanctuary
-> Try to stay in this moment longer => memory-fades

:: memory-fades
The Memory Slips Away
You cannot hold it. The golden light decomposes, grandmother's face blurs, the lullaby distorts. Clinging to what is passing causes pain, and the memory slips through your fingers like water. The library feels colder now.

-> Return to the library => sanctuary
-> Let the loss overwhelm you => ending-lost

:: dark-memory
The Storm
A bedroom you recognize but wish you did not. Rain hammers the windows; angry voices echo from downstairs. This memory cuts like broken glass — trauma preserved in your mind's library. Face it fully, or flee.

-> Listen to the full argument (Face it) => trauma-processing
-> Leave the memory unprocessed => sanctuary

:: trauma-processing
Confronting the Past
You listen. Really listen. The words sting, but something shifts: the argument was not your fault. Understanding does not erase the hurt, but it transforms it. Your sanity takes a hit, yet your clarity sharpens. The trade was worth it.

-> Process this wisdom in the sanctuary => sanctuary
-> Seek the forgotten wing => forgotten-wing

:: forgotten-wing
The Forgotten Wing
A part of the library you do not remember: older books, dust, cobwebs. On a pedestal sits a single faintly glowing volume — a moment of choice, a turning point that shaped everything after.

-> Fully integrate this memory => integration
-> Leave this wing and return => sanctuary

:: integration
Integration
The memory floods through you, not separate from you but part of you. Understanding your own history takes everything you have; your sanity fragments slightly under the weight, but your clarity becomes crystalline. You are more whole than before.

-> Rest in the sanctuary => sanctuary
-> Seek out the Hope Ritual => hope-ritual

:: hope-ritual
The Hope Ritual
In the deepest part of the library you find an ancient ritual written in a language you somehow understand: a way of binding recovered memories, hard-won clarity, and sanity back together. With each word you feel yourself solidify.

-> Complete the ritual and wake => ending-healed

:: ending-healed
Awakening
You open your eyes to morning sun through your bedroom window. The memories remain — and so do your strength, clarity, and understanding. You are no longer fragmented. Whatever comes next, you will face it whole.

-> Begin again (Restart) => sanctuary

:: ending-lost
Lost in the Library
Your sanity has fractured too far and the library dissolves around you. You are adrift among ancient memories, surrounded by books whose words no longer make sense. Perhaps it is okay to be lost sometimes. Perhaps rest is what you need.

-> Rest and rebuild (Restart) => sanctuary
`;

/** Seed story for first-time visitors. */
export const SAMPLE_STORY = DUSTY_ARCHIVE;

export const EXAMPLES: ExampleStory[] = [
  { id: 'dusty-archive', label: 'The Dusty Archive (DSL tour)', source: DUSTY_ARCHIVE },
  { id: 'hello-world', label: 'Hello World (demo adaptation)', source: HELLO_WORLD },
  { id: 'detective-case', label: "The Detective's Case (demo adaptation)", source: DETECTIVE_CASE },
  { id: 'memory-keeper', label: 'The Memory Keeper (demo adaptation)', source: MEMORY_KEEPER },
];
