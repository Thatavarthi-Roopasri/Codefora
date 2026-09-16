import { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

export function WarTeamChat({ messages, text, setText, onSend, sending, connected, team }) {
  const list = useRef(null);
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [messages]);
  return <><p className="codewar-panel-hint">Private to Team {team}. {connected ? '' : 'Reconnecting…'}</p>
    <div className="codewar-chat-list" ref={list} role="log" aria-label="Team messages" aria-live="polite">
      {messages.length ? messages.map(message => <p key={message.id}><strong>{message.senderName}</strong><span>{message.text}</span></p>) : <p>No team messages yet.</p>}
    </div>
    <form onSubmit={onSend} className="codewar-chat-form">
      <input aria-label="Team message" maxLength={500} value={text} onChange={event => setText(event.target.value)} placeholder="Message your team…" disabled={!connected || sending} />
      <button type="submit" aria-label="Send team message" disabled={!connected || sending || !text.trim()}><Send size={16} /></button>
    </form></>;
}

export function WarProblem({ problem }) {
  return <div className="codewar-problem"><h2>{problem.title}</h2><p>{problem.difficulty}</p>
    {problem.statement ? <pre>{problem.statement}</pre> : problem.bullets?.map(item => <p key={item}>{item}</p>)}
    {problem.constraints?.length > 0 && <><h3>Constraints</h3><ul>{problem.constraints.map(item => <li key={item}>{item}</li>)}</ul></>}
    {problem.tests?.length > 0 && <><h3>Sample tests</h3>{problem.tests.map((test, index) => <article key={index}><strong>Sample {index + 1}</strong><pre>Input: {test.input}</pre><pre>Output: {test.output}</pre></article>)}</>}
  </div>;
}

export function WarQuiz({ questions = [], answers = {}, currentIndex, onAnswer, onNext, onPrevious, onSubmit, disabled, submitted }) {
  const question = questions[currentIndex];
  if (!question) return <div className="codewar-quiz"><h2>No quiz questions are available.</h2></div>;
  const selected = answers[question.id];
  return <div className="codewar-quiz" aria-label="Codewars quiz">
    <div className="codewar-quiz-progress"><span>Question {currentIndex + 1} of {questions.length}</span><span>{Object.keys(answers).length} answered</span></div>
    <div className="codewar-quiz-track"><i style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} /></div>
    <h2>{question.prompt}</h2>
    <div className="codewar-quiz-options" role="radiogroup" aria-label={question.prompt}>
      {question.options.map((option, index) => { const letter = String.fromCharCode(65 + index); return <button key={letter} type="button" className={selected === letter ? 'selected' : ''} role="radio" aria-checked={selected === letter} onClick={() => onAnswer(question.id, letter)} disabled={disabled || submitted}><b>{letter}</b><span>{option}</span></button>; })}
    </div>
    <div className="codewar-quiz-actions"><button type="button" onClick={onPrevious} disabled={currentIndex === 0 || disabled}>Previous</button>{currentIndex < questions.length - 1 ? <button type="button" onClick={onNext} disabled={!selected || disabled}>Next</button> : <button type="button" className="submit" onClick={onSubmit} disabled={disabled || Object.keys(answers).length !== questions.length}>{submitted ? 'Submitted' : 'Submit quiz'}</button>}</div>
  </div>;
}

export function WarActivity({ activity = [] }) {
  return <ol className="codewar-activity" aria-label="Battle activity">{activity.length ? [...activity].reverse().map((item, index) => <li key={item.id || index}><span>{item.text || item.message}</span><time>{new Date(item.createdAt).toLocaleTimeString()}</time></li>) : <li>No activity yet.</li>}</ol>;
}
