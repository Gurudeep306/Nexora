/*
  Real words one or two letters from a command word but meaning something
  else ("contents" ≠ contests, "analysis" ≠ analytics, "parse" ≠ pause): the
  matcher never takes one of these as a speech-recognition slip.
  Made by scripts/voice/build-real-words.mjs from the site's study material;
  do not edit by hand. 234 words.
*/
export const REAL_WORDS: ReadonlySet<string> = new Set([
  'analysis', 'approached', 'badly', 'bank', 'bare', 'bark', 'baud', 'bback', 'bench', 'bend', 'bind',
  'black', 'bold', 'bookmarked', 'brand', 'calculate', 'calculated', 'calculates', 'calculation', 'came',
  'centr', 'chance', 'changed', 'charge', 'chip', 'chose', 'clean', 'clone', 'closed', 'closer', 'codd',
  'coded', 'codeq', 'comb', 'coming', 'comment', 'comp', 'company', 'concepts', 'connects', 'consists',
  'contacts', 'content', 'contents', 'context', 'converts', 'cope', 'core', 'couples', 'courseid', 'courseno',
  'dairy', 'daisy', 'dont', 'explained', 'exploit', 'finder', 'fine', 'finer', 'fund', 'game', 'gated',
  'gave', 'given', 'halve', 'hang', 'hard', 'hare', 'havel', 'held', 'hero', 'hire', 'hole', 'hope', 'horn',
  'introduced', 'judged', 'karp', 'keyword', 'late', 'latex', 'layer', 'leading', 'leaking', 'lean',
  'leaning', 'least', 'leaving', 'lessn', 'life', 'lift', 'like', 'line', 'lista', 'listed', 'listing',
  'lived', 'lock', 'loop', 'lost', 'love', 'made', 'mail', 'mask', 'maxn', 'mean', 'merit', 'model', 'modp',
  'mods', 'moore', 'moved', 'movie', 'named', 'neat', 'nest', 'nname', 'nodes', 'noted', 'noteq', 'nots',
  'nsame', 'olen', 'pace', 'paged', 'paint', 'pair', 'pals', 'park', 'parse', 'party', 'pass', 'past', 'path',
  'pays', 'plas', 'port', 'practical', 'practise', 'prec', 'precious', 'prev', 'previously', 'print',
  'promise', 'prop', 'provide', 'queued', 'reaching', 'readint', 'readline', 'ready', 'real', 'rear',
  'recoding', 'regarding', 'relating', 'relying', 'renaming', 'rend', 'residing', 'respond', 'responds',
  'resting', 'reusing', 'road', 'roms', 'roots', 'safe', 'sale', 'same', 'saved', 'seal', 'sealing', 'seam',
  'seating', 'seeding', 'selection', 'selling', 'sending', 'sent', 'serves', 'serving', 'session', 'setminus',
  'settling', 'shaft', 'shave', 'shirt', 'shop', 'shown', 'sided', 'sift', 'site', 'sitting', 'size', 'slave',
  'slide', 'slow', 'smin', 'snow', 'sorting', 'span', 'spotting', 'stale', 'station', 'stem', 'stitch',
  'stmp', 'strings', 'takea', 'takeb', 'taken', 'tall', 'tape', 'task', 'teaches', 'text', 'texts', 'than',
  'them', 'there', 'these', 'thin', 'thus', 'typed', 'typo', 'wake', 'wall', 'want', 'weave', 'width', 'will',
  'wish',
])
