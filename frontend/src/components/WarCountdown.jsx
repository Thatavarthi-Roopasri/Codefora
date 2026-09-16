import { useRef } from 'react';
import { ShieldCheck, Sword, UserRound } from 'lucide-react';
import { warCountdownSeconds } from '../lib/serverClock';
import './warCountdown.css';

function CountdownTeam({ team, players, capacity }) {
  const Icon = team === 'LOOP' ? Sword : ShieldCheck;
  return (
    <div className={`war-launch-team war-launch-${team.toLowerCase()}`}>
      <div className="war-launch-team-name"><Icon size={17} /><span>Team {team === 'LOOP' ? 'Loop' : 'Sider'}</span></div>
      <div className="war-launch-roster">
        {Array.from({ length: capacity }, (_, index) => {
          const player = players[index];
          return <div key={player?.id || index} className={`war-launch-player${player ? '' : ' is-empty'}`} title={player?.name || 'Open slot'}>
            <div className="war-launch-avatar">{player?.photoURL ? <img src={player.photoURL} alt="" referrerPolicy="no-referrer" /> : player ? player.name?.charAt(0)?.toUpperCase() || 'U' : <UserRound size={20} />}</div>
            {player && <span className="war-launch-player-name">{player.name}</span>}
          </div>;
        })}
      </div>
    </div>
  );
}

function CountdownDigit({ seconds, elapsed }) {
  // Capture the beat offset once; changing animation-delay each tick would speed it up.
  const delay = useRef(-Math.max(0, Math.min(999, elapsed)));
  return <div className="war-launch-number" style={{ '--beat-delay': `${delay.current}ms` }}><span className="war-launch-digit" data-text={seconds || 'GO'}>{seconds || 'GO'}</span></div>;
}

export function WarCountdown({ arena, now, team, loop, sider }) {
  const seconds = warCountdownSeconds(arena.startsAt, now);
  const remaining = Math.max(0, (arena.startsAt || now) - now);
  const beatElapsed = seconds ? 1000 - (remaining - (seconds - 1) * 1000) : 0;
  const progress = Math.min(1, remaining / 5000);
  const theme = team === 'LOOP' ? 'loop' : team === 'SIDER' ? 'sider' : 'neutral';
  return (
    <div className={`war-launch-overlay war-launch-${theme}`} data-countdown={seconds} role="status" aria-live="polite" aria-atomic="true">
      <span className="war-launch-sr-only">{seconds ? `Battle starts in ${seconds}` : 'Battle starting'}</span>
      <div className="war-launch-embers" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ '--spark-x': `${(index * 37 + 7) % 100}%`, '--spark-delay': `${-index * 0.31}s`, '--spark-drift': `${index % 2 ? 50 : -50}px` }} />)}</div>
      <div className="war-launch-stage" aria-hidden="true">
        <CountdownTeam team="LOOP" players={loop} capacity={arena.teamSize || 1} />
        <div className="war-launch-core">
          <div className="war-launch-halo" />
          <div className="war-launch-orbit war-launch-orbit-outer" />
          <div className="war-launch-orbit war-launch-orbit-inner" />
          <svg className="war-launch-progress" viewBox="0 0 440 440"><circle className="war-launch-track" cx="220" cy="220" r="205" /><circle className="war-launch-arc" cx="220" cy="220" r="205" pathLength="1" strokeDasharray={`${progress} 1`} /></svg>
          <CountdownDigit key={seconds} seconds={seconds} elapsed={beatElapsed} />
          <div className="war-launch-caption"><strong>MATCH STARTING<span className="war-launch-dots"><i /><i /><i /></span></strong><p>Code War Arena</p></div>
        </div>
        <CountdownTeam team="SIDER" players={sider} capacity={arena.teamSize || 1} />
      </div>
      <div className="war-launch-matchup" aria-hidden="true"><span>TEAM LOOP</span><b>VS</b><span>TEAM SIDER</span></div>
    </div>
  );
}
