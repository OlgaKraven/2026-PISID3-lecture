import { DeckClient } from './deck-client';
import { course } from './course-data';

export const dynamic = 'force-static';

export default function Home() {
  return <DeckClient course={course} />;
}
