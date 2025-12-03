import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import BeamerView from '../views/BeamerView';

// Beamer-Seite: liest roomCode aus URL (?roomCode=XYZ oder /beamer/XYZ). FÃ¤llt auf MAIN zurÃ¼ck.
const BeamerPage = () => {
  const { roomCode: paramCode } = useParams<{ roomCode?: string }>();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('roomCode') || undefined;

  const roomCode = useMemo(() => queryCode || paramCode || 'MAIN', [paramCode, queryCode]);

  return <BeamerView roomCode={roomCode} />;
};

export default BeamerPage;
