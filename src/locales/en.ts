export interface Strings {
  appTitle: string;
  appSubtitle: string;

  setupTitle: string;
  setupPlayerCount: string;
  setupNames: string;
  setupMatchMode: string;
  setupStartingLife: string;
  setupStart: string;
  setupHint: string;
  setupNamePlaceholder: string;

  modeSingle: string;
  modeBestOf3: string;
  modeBestOf5: string;
  modeSingleHint: string;
  modeBestOf3Hint: string;
  modeBestOf5Hint: string;

  boardActivePlayer: string;
  boardYourTurn: string;
  boardAddPlayer: string;
  boardRemovePlayer: string;
  boardPlayerCount: string;

  lifeDecrease: string;
  lifeIncrease: string;
  lifeDecreaseBy: string;
  lifeIncreaseBy: string;
  lifeValue: string;

  tapToggle: string;
  tappedBadge: string;
  nameLabel: string;
  counterAdd: string;
  counterName: string;
  counterKind: string;
  counterDecrease: string;
  counterIncrease: string;
  counterRemove: string;
  counterValue: string;

  kindBuff: string;
  kindHazard: string;
  kindCustom: string;

  toolbarNextTurn: string;
  toolbarUndo: string;
  toolbarDice: string;
  toolbarTimer: string;
  toolbarMatch: string;
  toolbarMore: string;
  toolbarSettings: string;
  toolbarResetGame: string;
  toolbarNewMatch: string;

  statusLine: string;
  moreTitle: string;
  playerSheetTitle: string;
  lifeSteps: string;
  countersSection: string;
  playersSection: string;
  noCounters: string;
  counterRename: string;
  removePlayerAction: string;

  diceTitle: string;
  diceRoll: string;
  diceHistory: string;
  diceEmpty: string;
  diceHint: string;
  diceRolled: string;

  timerTitle: string;
  timerStart: string;
  timerPause: string;
  timerReset: string;
  timerIdle: string;
  timerTotal: string;

  matchTitle: string;
  matchTotalTime: string;
  matchGameNumber: string;
  matchGamesPlayed: string;
  matchWins: string;
  matchAwardWin: string;
  matchWinner: string;
  matchNextGame: string;
  matchNew: string;
  matchNoWinner: string;

  settingsTitle: string;
  settingsStartingLife: string;
  settingsMatchMode: string;
  settingsKeepAwake: string;
  settingsKeepAwakeHint: string;
  settingsHaptics: string;
  settingsHapticsHint: string;
  settingsClearData: string;
  settingsClearDataHint: string;
  settingsFullReset: string;
  settingsFullResetHint: string;

  commonClose: string;
  commonCancel: string;
  commonAdd: string;
  commonRemove: string;
  commonApply: string;
  commonSave: string;

  announceLifeChanged: string;
  announceTurnChanged: string;
  announceUndo: string;
  announceMatchWinner: string;
}

export const en: Strings = {
  appTitle: 'Magic Life Counter',
  appSubtitle: 'Life, counters and dice for your table',

  setupTitle: 'Set up the game',
  setupPlayerCount: 'Players',
  setupNames: 'Player names',
  setupMatchMode: 'Match mode',
  setupStartingLife: 'Starting life',
  setupStart: 'Start game',
  setupHint: 'Names, player count and starting life can be changed while you play.',
  setupNamePlaceholder: 'Player name',

  modeSingle: 'Single game',
  modeBestOf3: 'Best of 3',
  modeBestOf5: 'Best of 5',
  modeSingleHint: 'One game decides the match.',
  modeBestOf3Hint: 'First to 2 wins takes the match.',
  modeBestOf5Hint: 'First to 3 wins takes the match.',

  boardActivePlayer: 'Active player',
  boardYourTurn: 'Turn',
  boardAddPlayer: 'Add player',
  boardRemovePlayer: 'Remove player',
  boardPlayerCount: 'Players: {count}',

  lifeDecrease: 'Decrease life for {name}',
  lifeIncrease: 'Increase life for {name}',
  lifeDecreaseBy: 'Decrease life for {name} by {amount}',
  lifeIncreaseBy: 'Increase life for {name} by {amount}',
  lifeValue: '{name} life',

  tapToggle: 'Tap or untap {name}',
  tappedBadge: 'Tapped',
  nameLabel: 'Name of {name}',
  counterAdd: 'Add counter',
  counterName: 'Counter name',
  counterKind: 'Counter type',
  counterDecrease: 'Decrease {name}',
  counterIncrease: 'Increase {name}',
  counterRemove: 'Remove {name}',
  counterValue: '{name} value',

  kindBuff: 'Buff',
  kindHazard: 'Hazard',
  kindCustom: 'Custom',

  toolbarNextTurn: 'Next turn',
  toolbarUndo: 'Undo',
  toolbarDice: 'Dice',
  toolbarTimer: 'Timer',
  toolbarMatch: 'Match',
  toolbarMore: 'More',
  toolbarSettings: 'Settings',
  toolbarResetGame: 'Reset game',
  toolbarNewMatch: 'New match',

  statusLine: "{name}'s turn · Game {game}",
  moreTitle: 'More',
  playerSheetTitle: 'Counters · {name}',
  lifeSteps: 'Life steps',
  countersSection: 'Counters',
  playersSection: 'Players',
  noCounters: 'No counters yet.',
  counterRename: 'Rename {name}',
  removePlayerAction: 'Remove player',

  diceTitle: 'Dice roller',
  diceRoll: 'Roll a d{sides}',
  diceHistory: 'History',
  diceEmpty: 'No rolls yet.',
  diceHint: 'Roll a die to start the history.',
  diceRolled: 'Rolled {value} on a d{sides}',

  timerTitle: 'Turn timer',
  timerStart: 'Start',
  timerPause: 'Pause',
  timerReset: 'Reset',
  timerIdle: 'Not running',
  timerTotal: 'Total for {name}',

  matchTitle: 'Match tracker',
  matchTotalTime: 'Total time',
  matchGameNumber: 'Game {number}',
  matchGamesPlayed: 'Games played: {count}',
  matchWins: 'Wins',
  matchAwardWin: 'Award the win to {name}',
  matchWinner: '{name} wins the match!',
  matchNextGame: 'Start the next game',
  matchNew: 'Start a new match',
  matchNoWinner: 'No match winner yet.',

  settingsTitle: 'Settings',
  settingsStartingLife: 'Starting life',
  settingsMatchMode: 'Match mode',
  settingsKeepAwake: 'Keep screen awake',
  settingsKeepAwakeHint: 'Uses the Wake Lock API when the device supports it.',
  settingsHaptics: 'Haptics',
  settingsHapticsHint: 'Vibrates on life and turn changes when supported.',
  settingsClearData: 'Clear stored data',
  settingsClearDataHint: 'Removes the saved game from this device.',
  settingsFullReset: 'Full reset',
  settingsFullResetHint: 'Back to the setup screen to start a fresh match.',

  commonClose: 'Close',
  commonCancel: 'Cancel',
  commonAdd: 'Add',
  commonRemove: 'Remove',
  commonApply: 'Apply',
  commonSave: 'Save',

  announceLifeChanged: '{name} life is now {life}',
  announceTurnChanged: "Turn: {name}",
  announceUndo: 'Undone',
  announceMatchWinner: '{name} wins the match',
};

export type StringKey = keyof Strings;

export function t(key: StringKey, params?: Record<string, string | number>): string {
  const template = en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
