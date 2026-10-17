/**
 * NPC Data, Dialogues, and Open-World Quests
 */

export interface DialogueOption {
  label: string;
  nextDialogId?: string;
  questAction?: 'accept' | 'complete';
}

export interface DialogueNode {
  id: string;
  speaker: string;
  title: string;
  text: string;
  options: DialogueOption[];
}

export interface NPCDefinition {
  id: string;
  name: string;
  role: string;
  x: number;
  z: number;
  colorCoat: string;
  colorAccent: string;
  hasHat: boolean;
  introDialogId: string;
  dialogues: Record<string, DialogueNode>;
  assignedQuestId?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  targetLandmark: string;
  targetX: number;
  targetZ: number;
  isCompleted: boolean;
  rewardText: string;
}

export const NPCS: NPCDefinition[] = [
  {
    id: 'jax',
    name: 'Ranger Jax',
    role: 'Highland Warden',
    x: 62,
    z: -68, // Beside Highland Watchtower
    colorCoat: '#2d6a4f',
    colorAccent: '#d8f3dc',
    hasHat: true,
    introDialogId: 'jax_intro',
    assignedQuestId: 'quest_watchtower',
    dialogues: {
      jax_intro: {
        id: 'jax_intro',
        speaker: 'Ranger Jax',
        title: 'Highland Warden',
        text: 'Greetings, traveler! Few vehicles make it up the Highland switchbacks in one piece. What brings your rover up to the Watchtower?',
        options: [
          { label: 'Just charting the mountain passes.', nextDialogId: 'jax_weather' },
          { label: 'Need any help around the highlands?', nextDialogId: 'jax_quest' },
          { label: 'Safe travels, Ranger.', nextDialogId: undefined },
        ],
      },
      jax_weather: {
        id: 'jax_weather',
        speaker: 'Ranger Jax',
        title: 'Highland Warden',
        text: 'Keep a sharp eye on the skies. Autumn squalls and mountain snowdrifts roll in fast across Echo Ridge. Your high-beams will cut right through the fog.',
        options: [
          { label: 'Thanks for the warning.', nextDialogId: 'jax_intro' },
          { label: 'I can handle it.', nextDialogId: undefined },
        ],
      },
      jax_quest: {
        id: 'jax_quest',
        speaker: 'Ranger Jax',
        title: 'Highland Warden',
        text: 'As a matter of fact, yes. Our signal transceiver down at the Echo Ridge Antenna mast went offline. Could you drive over and inspect the array?',
        options: [
          { label: 'Consider it done. I will head to Echo Ridge.', questAction: 'accept', nextDialogId: 'jax_accepted' },
          { label: 'Maybe later when the storm clears.', nextDialogId: undefined },
        ],
      },
      jax_accepted: {
        id: 'jax_accepted',
        speaker: 'Ranger Jax',
        title: 'Highland Warden',
        text: 'Splendid! Follow the western pass road across the valley. Look for the blinking red beacon on top of Echo Ridge.',
        options: [
          { label: 'On my way!', nextDialogId: undefined },
        ],
      },
      jax_completed: {
        id: 'jax_completed',
        speaker: 'Ranger Jax',
        title: 'Highland Warden',
        text: 'I saw the telemetry relay kick back on! Superb driving, Wayfarer. Take this high-octane fuel reserve for your journey.',
        options: [
          { label: 'Happy to help keep the ridge connected.', nextDialogId: undefined },
        ],
      },
    },
  },
  {
    id: 'chloe',
    name: 'Mechanic Chloe',
    role: 'Valley Workshop Specialist',
    x: -78,
    z: -38, // At Meadow Workshop
    colorCoat: '#d97706',
    colorAccent: '#fbbf24',
    hasHat: false,
    introDialogId: 'chloe_intro',
    assignedQuestId: 'quest_workshop',
    dialogues: {
      chloe_intro: {
        id: 'chloe_intro',
        speaker: 'Mechanic Chloe',
        title: 'Valley Workshop Specialist',
        text: 'Hey there! Look at that custom rig. Twin double-wishbone suspension, all-terrain tires. She sounds like a purring beast!',
        options: [
          { label: 'Can you tell me about the nitro boost?', nextDialogId: 'chloe_boost' },
          { label: 'Any spare parts around here?', nextDialogId: 'chloe_quest' },
          { label: 'Just passing through.', nextDialogId: undefined },
        ],
      },
      chloe_boost: {
        id: 'chloe_boost',
        speaker: 'Mechanic Chloe',
        title: 'Valley Workshop Specialist',
        text: 'Hold down [Left Shift] while accelerating! It dumps high-pressure oxidizer straight into the intake. Just watch your heat gauge—give it a few seconds to recharge between long straights.',
        options: [
          { label: 'Good to know. Thanks, Chloe!', nextDialogId: 'chloe_intro' },
        ],
      },
      chloe_quest: {
        id: 'chloe_quest',
        speaker: 'Mechanic Chloe',
        title: 'Valley Workshop Specialist',
        text: 'Old Silas set up his field camp down by Whispering Lake, but he forgot his water-sealed survey toolbox here. Would you take it down to him?',
        options: [
          { label: 'Sure, I will deliver the kit to Silas.', questAction: 'accept', nextDialogId: 'chloe_accepted' },
          { label: 'I am heading the other direction.', nextDialogId: undefined },
        ],
      },
      chloe_accepted: {
        id: 'chloe_accepted',
        speaker: 'Mechanic Chloe',
        title: 'Valley Workshop Specialist',
        text: 'You are a lifesaver! Take the southern dirt road straight toward the blue waters of Whispering Lake. He has a cozy yellow tent near the shore.',
        options: [
          { label: 'Heading to Whispering Lake now.', nextDialogId: undefined },
        ],
      },
      chloe_completed: {
        id: 'chloe_completed',
        speaker: 'Mechanic Chloe',
        title: 'Valley Workshop Specialist',
        text: 'Silas radioed in—he got the kit! You really know how to carve up those valley trails.',
        options: [
          { label: 'Glad I could deliver it safely.', nextDialogId: undefined },
        ],
      },
    },
  },
  {
    id: 'silas',
    name: 'Explorer Silas',
    role: 'Naturalist & Cartographer',
    x: 38,
    z: 92, // By Whispering Lake
    colorCoat: '#4361ee',
    colorAccent: '#4cc9f0',
    hasHat: true,
    introDialogId: 'silas_intro',
    assignedQuestId: 'quest_lake',
    dialogues: {
      silas_intro: {
        id: 'silas_intro',
        speaker: 'Explorer Silas',
        title: 'Naturalist & Cartographer',
        text: 'Ah, listen to that... the water lapping the shoreline. Whispering Lake is the most peaceful corner in the entire overland basin.',
        options: [
          { label: 'Chloe sent me with your survey toolbox!', nextDialogId: 'silas_delivered' },
          { label: 'What is the best scenic spot here?', nextDialogId: 'silas_vista' },
          { label: 'Enjoy the view, Silas.', nextDialogId: undefined },
        ],
      },
      silas_delivered: {
        id: 'silas_delivered',
        speaker: 'Explorer Silas',
        title: 'Naturalist & Cartographer',
        text: 'By thunder, my watertight kit! You crossed the whole river basin to bring this? Thank you kindly, brave driver!',
        options: [
          { label: 'Happy to help an explorer out!', questAction: 'complete', nextDialogId: 'silas_lore' },
        ],
      },
      silas_vista: {
        id: 'silas_vista',
        speaker: 'Explorer Silas',
        title: 'Naturalist & Cartographer',
        text: 'Climb up to the Highland Watchtower or the Radio Mast at dusk. Watching the sun dip below the jagged alpine ridges while the northern lights or stars come out is breathtaking.',
        options: [
          { label: 'I will definitely drive up there.', nextDialogId: 'silas_intro' },
        ],
      },
      silas_lore: {
        id: 'silas_lore',
        speaker: 'Explorer Silas',
        title: 'Naturalist & Cartographer',
        text: 'Now I can finish mapping the lake depths. If you switch into first-person cockpit camera and drive along the shoreline during a thunderstorm, the atmospheric reflections are unbelievable!',
        options: [
          { label: 'I will try that out!', nextDialogId: undefined },
        ],
      },
    },
  },
];

export const INITIAL_QUESTS: Quest[] = [
  {
    id: 'quest_watchtower',
    title: 'Echo Ridge Telemetry',
    description: 'Drive across the western pass to inspect the Antenna Mast at Echo Ridge (-95, 85).',
    targetLandmark: 'Echo Ridge Antenna',
    targetX: -95,
    targetZ: 85,
    isCompleted: false,
    rewardText: 'High-octane fuel reserves unlocked & valley communications restored!',
  },
  {
    id: 'quest_workshop',
    title: 'Survey Kit Delivery',
    description: 'Deliver the sealed survey toolbox from Chloe to Explorer Silas at Whispering Lake (38, 92).',
    targetLandmark: 'Whispering Lake Camp',
    targetX: 38,
    targetZ: 92,
    isCompleted: false,
    rewardText: 'Cartographer respect & detailed region compass calibration!',
  },
];
