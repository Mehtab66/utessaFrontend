import { PageHeader } from '../crm/ui'
import LibraryBrowser from './LibraryBrowser'

const COPY = {
  RESOURCES: {
    title: 'Resources',
    subtitle: 'Practice forms, policies, handouts and templates in folders. Everyone can open them; admins add, write and organize them.',
  },
  TRAINING: {
    title: 'Training',
    subtitle: 'Training folders by designation, with written training documents, checklists, quizzes and competency sign-offs. Drafts are a starting point — have clinical training approved before use.',
  },
}

/** Resources and Training libraries: folder tree, uploads and the built-in document writer. */
export default function LibraryPage({ space = 'RESOURCES' }) {
  const copy = COPY[space]
  return (
    <div>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      <LibraryBrowser key={space} space={space} writer />
    </div>
  )
}
