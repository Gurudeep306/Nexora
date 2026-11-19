import { assembleTopic } from '../../../assemble.ts'
import { args, check, define, docs, scope, values } from './pages.ts'
import { questions } from './questions.ts'

export default assembleTopic({
  id: 'f-py-functions',
  title: 'Writing functions: arguments, return values and scope',
  blurb: 'def and return; return versus print; positional, keyword and default arguments; *args and **kwargs; frames and scope; returning several values; functions as values; lambda; recursion and the call stack; docstrings and type hints.',
  pages: [define, args, scope, values, docs, check],
  questions,
})
