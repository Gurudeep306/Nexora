import { assembleTopic } from '../../../assemble.ts'
import { check, formatting, index, methods, text, unicode } from './pages.ts'
import { questions } from './questions.ts'

export default assembleTopic({
  id: 'f-py-strings',
  title: 'Text: strings, f-strings and printing',
  blurb: 'Quotes, escapes and raw strings; len; indexing and slicing; immutability; the string methods used to clean text; f-strings and format specifications; print options; t-strings; Unicode and UTF-8.',
  pages: [text, index, methods, formatting, unicode, check],
  questions,
})
