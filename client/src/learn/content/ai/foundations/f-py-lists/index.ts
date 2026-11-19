import { assembleTopic } from '../../../assemble.ts'
import { aliasing, check, lists, methods, nested, tuples } from './pages.ts'
import { questions } from './questions.ts'

export default assembleTopic({
  id: 'f-py-lists',
  title: 'Lists and tuples: indexing, slicing, sorting and copying',
  blurb: 'Making, indexing, slicing and changing lists; sum, min and max; every list method and which ones change the list; sort versus sorted; two names on one list, is versus ==, shallow and deep copies; lists of lists and the multiplication trap; tuples, packing and unpacking.',
  pages: [lists, methods, aliasing, nested, tuples, check],
  questions,
})
